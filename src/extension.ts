import { commands, ExtensionContext, Position, Range, Selection, TextDocument, TextEditor, TextEditorEdit, TextLine, window, workspace } from "vscode";
import LanguageParser from "./languageParser";

let enable: boolean;
let autoLineChange: boolean;
let acceptSuggestions: boolean;
let deleteEmptyLine: boolean;

const clangFamilyParser = new LanguageParser('//', ['{', '}'], ['for'], ['return', 'throw', 'continue', 'break']);
const languageParsers = new Map<string, LanguageParser | null>(
    [
        ['c', clangFamilyParser],
        ['cpp', clangFamilyParser],
        ['csharp', clangFamilyParser],
        ['java', clangFamilyParser],
        ['javascript', clangFamilyParser],
        ['typescript', clangFamilyParser],
        ['javascriptreact', clangFamilyParser],
        ['typescriptreact', clangFamilyParser],
        ['rust', clangFamilyParser],
    ]
);

export function activate(context: ExtensionContext)
{
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

    await smartInsert(editor, document, parser);
}

async function smartInsert(editor: TextEditor, document: TextDocument, parser: LanguageParser)
{
    const newSelections: Selection[] = [];
    const selectionCount = editor.selections.length;
    let wasDelete = false;

    await editor.edit((text) =>
    {
        for (let selection of editor.selections)
        {
            const line = document.lineAt(selection.active.line);
            if (line.isEmptyOrWhitespace && deleteEmptyLine)
            {
                newSelections.push(deleteLine(text, document, line, selection));
                wasDelete = true;
                continue;
            }

            let sameLineCursors = editor.selections.filter((select, _, __) => document.lineAt(select.active.line).lineNumber == line.lineNumber && select != selection);

            let position;
            if (sameLineCursors.length == 0)
            {
                position = parser ? parser.getSemicolonPosition(line, selection.active) : getLineEndPosition(line);
                if (position.character == 0 || line.text.charAt(position.character - 1) != ';')
                {
                    text.insert(position, ';');
                }
                position = position.translate(0, 1);
            }
            else
            {
                position = selection.active;
                text.insert(selection.active, ';');
                position = position.translate(0, 1 + sameLineCursors.filter((select) => select.start.character < selection.start.character).length);
            }
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
    editor.edit((text) =>
    {
        for (let selection of editor.selections)
        {
            text.insert(selection.active, ';');
        }
    });
}

function toggle()
{
    enable = !enable;
    workspace.getConfiguration('smartersemicolon').update('enable', enable, true);
}

function toggleAutoLineChange()
{
    autoLineChange = !autoLineChange;
    workspace.getConfiguration('smartersemicolon').update('autoLineChange', autoLineChange, true);
}

function updateConfiguration()
{
    const config = workspace.getConfiguration('smartersemicolon');

    enable = config.get('enable')!;
    autoLineChange = config.get('autoLineChange')!;
    acceptSuggestions = config.get('acceptSuggestions')!;
    deleteEmptyLine = config.get('deleteEmptyLine')!;
    let excludedLanguages = config.get<Array<string>>('languageExclusions')!;

    for (const lang of excludedLanguages)
    {
        languageParsers.set(lang, null);
    }
}
