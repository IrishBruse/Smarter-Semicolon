'use strict';

import { commands, ExtensionContext, Position, Range, Selection, StatusBarAlignment, StatusBarItem, TextDocument, TextEditor, TextEditorEdit, TextLine, window, workspace } from "vscode";

import { LanguageParser } from "./languageParser";

export function activate(context: ExtensionContext)
{
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right);
    statusBarItem.command = 'smartersemicolon.toggleAutoLineChange';
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(workspace.onDidChangeConfiguration(updateConfiguration));
    context.subscriptions.push(workspace.onDidChangeTextDocument(updateConfiguration));

    context.subscriptions.push(commands.registerCommand('smartersemicolon.insert', insert));
    context.subscriptions.push(commands.registerCommand('smartersemicolon.toggle', toggle));
    context.subscriptions.push(commands.registerCommand('smartersemicolon.toggleAutoLineChange', toggleAutoLineChange));
}

async function insert()
{
    const editor = window.activeTextEditor;
    if (!editor)
    {
        return;
    }

    if (!enable)
    {
        normalInsert(editor);
        return;
    }

    const document = editor.document;
    let parser = languageParsers.get(document.languageId);

    await commands.executeCommand('leaveSnippet');

    if (parser === null)
    {
        return
    }

    if (parser === undefined)
    {
        parser = clangFamilyParser
    }

    if (acceptSuggestions)
    {
        await commands.executeCommand('acceptSelectedSuggestion')
    }

    await doInsert(editor, document, parser);
}

async function doInsert(editor: TextEditor, document: TextDocument, parser: LanguageParser)
{
    const newSelections: Selection[] = [];
    const selectionCount = editor.selections.length;
    let wasDelete = false;

    await editor.edit((editBuilder) =>
    {
        for (let selection of editor.selections)
        {
            const line = document.lineAt(selection.active.line);
            if (line.isEmptyOrWhitespace && deleteEmptyLine)
            {
                newSelections.push(deleteLine(editBuilder, document, line, selection));
                wasDelete = true;
                continue;
            }

            let position = parser ? parser.getSemicolonPosition(line, selection.active) : getLineEndPosition(line);
            if (position.character == 0 || line.text.charAt(position.character - 1) != ';')
            {
                editBuilder.insert(position, ';');
            }
            position = position.translate(0, 1);
            newSelections.push(new Selection(position, position));
        }
    })

    editor.selections = newSelections;

    if (selectionCount == 1 && autoLineChange && !wasDelete)
    {
        const lineNumber = editor.selection.active.line;
        let canInsert: boolean;
        if (parser)
        {
            canInsert = parser.canInsertLineAfter(document, lineNumber);
        }
        else
        {
            if (lineNumber == document.lineCount - 1)
            {
                canInsert = true;
            }
            else
            {
                const nextLine = document.lineAt(lineNumber + 1);
                canInsert = nextLine.isEmptyOrWhitespace;
            }
        }

        if (canInsert)
        {
            commands.executeCommand('editor.action.insertLineAfter');
        }
    }
}

function deleteLine(editBuilder: TextEditorEdit, document: TextDocument, line: TextLine, selection: Selection): Selection
{
    if (line.lineNumber == 0 && document.lineCount == 1)
    {
        return new Selection(selection.active, selection.active);
    }

    let range: Range;
    let newSelection: Selection;
    if (line.lineNumber == 0)
    {
        const zeroPosition = new Position(0, 0);
        range = new Range(zeroPosition, zeroPosition.translate(1, 0));
        newSelection = new Selection(zeroPosition, zeroPosition);
    }
    else
    {
        const previousLineEnd = getLineEndPosition(document.lineAt(line.lineNumber - 1));
        range = new Range(previousLineEnd, getLineEndPosition(line));
        newSelection = new Selection(previousLineEnd, previousLineEnd);
    }

    editBuilder.delete(range);
    return newSelection;
}

function getLineEndPosition(line: TextLine): Position
{
    return new Position(line.lineNumber, line.text.length);
}

function normalInsert(editor: TextEditor)
{
    editor.edit((editBuilder) =>
    {
        for (let selection of editor.selections)
        {
            editBuilder.insert(selection.active, ';');
        }
    });
}

function toggle()
{
    enable = !enable;
    workspace.getConfiguration('smartersemicolon').update('enable', enable, true);
    updateStatusBarItem();
}

function toggleAutoLineChange()
{
    autoLineChange = !autoLineChange;
    workspace.getConfiguration('smartersemicolon').update('autoLineChange', autoLineChange, true);
    updateStatusBarItem();
}

function updateConfiguration()
{
    const config = workspace.getConfiguration('smartersemicolon');

    autoLineChange = config.get('autoLineChange')!;
    acceptSuggestions = config.get('acceptSuggestions')!;
    showInStatusBar = config.get('showInStatusBar')!;
    deleteEmptyLine = config.get('deleteEmptyLine')!;
    let excludedLanguages = config.get<Array<string>>('languageExclusions')!;

    for (const lang of excludedLanguages)
    {
        languageParsers.set(lang, null);
    }

    updateStatusBarItem();
}

function updateStatusBarItem()
{
    if (autoLineChange)
    {
        statusBarItem.text = statusBarItemTitle + ' $(arrow-down)';
    }
    else
    {
        statusBarItem.text = statusBarItemTitle;
    }

    if (enable && showInStatusBar)
    {
        statusBarItem.show();
    }
    else
    {
        statusBarItem.hide();
    }
}

let enable: boolean;
let autoLineChange: boolean;
let acceptSuggestions: boolean;
let showInStatusBar: boolean;
let deleteEmptyLine: boolean;

let statusBarItem: StatusBarItem;

const clangFamilyParser = new LanguageParser('//', ['{', '}'], ['for'], ['return', 'throw', 'continue', 'break']);
const languageParsers = new Map<string, LanguageParser | null>();
languageParsers.set('c', clangFamilyParser);
languageParsers.set('cpp', clangFamilyParser);
languageParsers.set('csharp', clangFamilyParser);
languageParsers.set('java', clangFamilyParser);
languageParsers.set('javascript', clangFamilyParser);
languageParsers.set('typescript', clangFamilyParser);
languageParsers.set('javascriptreact', clangFamilyParser);
languageParsers.set('typescriptreact', clangFamilyParser);
languageParsers.set('rust', clangFamilyParser);

const statusBarItemTitle = 'Smart Semicolon';
