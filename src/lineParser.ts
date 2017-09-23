'use strict';

import { CharacterPair, TextDocument, Position, TextLine } from "vscode";

export class LineParser {

    private lineComment: string;
    private brackets: CharacterPair;
    private strings: string[];
    private exceptionKeywords: string[];
    private autoLineChangeExceptionKeywords: string[];

    constructor(lineComment: string, brackets: CharacterPair, exceptionKeywords: string[], autoLineChangeExceptionKeywords: string[]) {
        this.lineComment = lineComment;
        this.brackets = brackets;
        this.exceptionKeywords = exceptionKeywords;
        this.autoLineChangeExceptionKeywords = autoLineChangeExceptionKeywords;
    }

    public getSemicolonPosition(document: TextDocument, position: Position): Position {
        const line = document.lineAt(position.line);
        const lineInfo: LineInfo = {
            skip: false,
            end: line.text.length,
            hasCloseBracketAfter: false
        };

        lineInfo.skip = this.isComment(line, position.character) || this.containsKeywords(line, this.exceptionKeywords);
        if (lineInfo.skip) {
            return position;
        }

        this.inspectBrackets(line, lineInfo, position.character);
        lineInfo.end = this.findNonWhitespace(line, lineInfo.end) + 1;
        return new Position(position.line, lineInfo.end);
    }

    private containsKeywords(line: TextLine, keywords: string[]): boolean {
        if (!keywords) {
            return false;
        }

        for (let keyword of keywords) {
            const regex = new RegExp('\\s+' + keyword + '(\\s+|$)');
            if (line.text.match(regex)) {
                return true;
            }
        }

        return false;
    }

    private inspectBrackets(line: TextLine, lineInfo: LineInfo, character: number): void {
        if (!this.brackets) {
            return;
        }

        const positions = this.getPositions(this.brackets, line, character, lineInfo.end);
        if (positions[0] >= 0 && positions[1] >= 0) {
            if (positions[0] < positions[1]) {
                lineInfo.end = positions[0];
            } else {
                lineInfo.end = positions[1];
                lineInfo.hasCloseBracketAfter = true;
            }
        } else if (positions[0] >= 0) {
            lineInfo.end = positions[0];
        } else if (positions[1] >= 0) {
            lineInfo.end = positions[1];
            lineInfo.hasCloseBracketAfter = true;
        }
        lineInfo.end--;
    }

    private findNonWhitespace(line: TextLine, end: number): number {
        for (let i = end; i >= 0; i--) {
            const c = line.text.charAt(i);
            if (c != ' ' && c != '\t') {
                return i;
            }
        }
        return -1;
    }

    private getPositions(delimiter: CharacterPair, line: TextLine, character: number, end: number): CharacterPairPositions {
        let text = line.text;
        let position: CharacterPairPositions = [-1, -1];

        for (let i = 0; i < delimiter.length; i++) {
            let index = text.indexOf(delimiter[i], character);
            if (index <= end) {
                position[i] = index;
            }
        }

        return position;
    }

    public canInsertLineBelow(document: TextDocument, line: TextLine): boolean {
        if (this.containsKeywords(line, this.autoLineChangeExceptionKeywords)) {
            return false;
        }

        if (this.brackets) {
            let needCheckAboveLine = line.lineNumber > 0;
            let needCheckBelowLine = line.lineNumber < document.lineCount - 1;
            let isAboveLineOpen = false;
            let isBelowLineClose = false;
            let isBelowLineCode = false;

            if (needCheckAboveLine) {
                let aboveLine = document.lineAt(line.lineNumber - 1);
                let openIndex = aboveLine.text.lastIndexOf(this.brackets[0]);
                let closeIndex = aboveLine.text.lastIndexOf(this.brackets[1]);

                if (openIndex >= 0 && (closeIndex < 0 || closeIndex < openIndex)) {
                    isAboveLineOpen = true;
                }
            }

            if (needCheckBelowLine) {
                let belowLine = document.lineAt(line.lineNumber + 1);
                let openIndex = belowLine.text.indexOf(this.brackets[0]);
                let closeIndex = belowLine.text.indexOf(this.brackets[1]);

                if (closeIndex >= 0 && (openIndex < 0 || closeIndex < openIndex)) {
                    isBelowLineClose = true;
                }

                isBelowLineCode = !isBelowLineClose &&
                    !belowLine.isEmptyOrWhitespace &&
                    !this.isComment(belowLine);
            }

            return !((isAboveLineOpen && isBelowLineClose) || isBelowLineCode);
        }

        return false;
    }

    private isComment(line: TextLine, character?: number): boolean {
        if (this.lineComment) {
            if (character === undefined) {
                return line.text.startsWith(this.lineComment, line.firstNonWhitespaceCharacterIndex);
            } else if (character > 0) {
                return line.text.lastIndexOf(this.lineComment, character - 1) >= 0;
            }
        }
        return false;
    }
}

interface LineInfo {
    skip: boolean;
    end: number;
    hasCloseBracketAfter: boolean;
}

type CharacterPairPositions = [number, number];