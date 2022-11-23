<div align="center">
    <img src="https://raw.githubusercontent.com/IrishBruse/Smarter-Semicolon/main/images/icon.png">
    <h1>Smarter Semicolon</h1>
</div>

# Smarter Semicolon Extension

This extension places semicolons at the end of an expression.

![Basic Feature](https://raw.githubusercontent.com/IrishBruse/Smarter-Semicolon/main/images/basic_feature.gif)

## Multi-line (New)

This extension allows you to add in semicolons using multiple cursors all using the smart detection.
![Multi-line](https://raw.githubusercontent.com/IrishBruse/Smarter-Semicolon/main/images/multi_line.gif)


## Excluded Languages (New)

This extension allows you to specify which language to stop you from putting in semi-colons. Useful for languages like python where muscle memory kicks in when you dont want it to.

## Semantic Detection

This extension detects line comments and language brackets and configures the end of the current expression.

## Automatic Line Change

![Auto Line Change Basic](https://raw.githubusercontent.com/IrishBruse/Smarter-Semicolon/main/images/auto_line_change_basic.gif)

When enabled, this extension automatically inserts a new line below the current cursor and put the cursor at the beginning of the new line on a semicolon key. The exceptions are when:

- If the current line is the only line inside a code block.
- If the below line is a code.
- If the current line has a close bracket after this expression.
- If the current line contains any of `autoLineChangeExceptionKeywords` (for example, you don't want to insert a new line after `return`, `throw` keywords in C#).

In case you don't want the newly-inserted line, simply putting another semicolon will cancel the insertion, and the cursor goes back to the previous position.

## Supported Languages
- Fallsback on c style if language is not known (New)
- Rust (New)
- JavascriptReact, TypescriptReact (New)
- C#
- C/C++
- Java
- Javascript, Typescript
- Go
- ShaderLab

## Extension Settings

* `smartersemicolon.enable`: Toggle this extension on/off.
* `smartersemicolon.autoLineChange`: Toggle the automatic line changing feature on/off.
* `smartersemicolon.acceptSuggestions`: If true, accept the current IntelliSense suggestion on a semicolon.
* `smartersemicolon.showInStatusBar`: Toggle the extension information on the status bar.
* `smartersemicolon.deleteEmptyLine`: Toggle deleting an empty line if the cursor is at the line and the user pressed a semicolon.
* `smartersemicolon.languageExclusions`: Languages to disable the extension in will not place a semicolon in these langauges as long as its enabed with `smartersemicolon.enable`
