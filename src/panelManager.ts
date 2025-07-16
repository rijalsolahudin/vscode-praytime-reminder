import * as vscode from 'vscode';

let lastWebviewPanel: vscode.WebviewPanel | undefined;

export function setLastWebviewPanel(panel: vscode.WebviewPanel | undefined) {
  lastWebviewPanel = panel;
}

export function getLastWebviewPanel(): vscode.WebviewPanel | undefined {
  return lastWebviewPanel;
}
