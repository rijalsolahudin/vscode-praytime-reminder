// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import { startStatusBar, disposeStatusBar } from './statusBar';
import { registerCommands } from './commands';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "praytime-reminder" is now active!');
  registerCommands(context);
  startStatusBar();
}

// This method is called when your extension is deactivated
export function deactivate() {
  disposeStatusBar();
}
