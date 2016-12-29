"use strict";

const {CompositeDisposable} = require("atom");
const isMagical = /([\/\\])magic\1Magdir\1[-.\w]+$/i;
const scopeName = "text.file-magic";


module.exports = {
	disposables: null,
	grammar:     null,
	
	activate(){
		this.disposables = new CompositeDisposable();
		this.waitToLoad().then(grammar => {
			this.grammar = grammar;
			this.disposables.add(
				atom.workspace.observeTextEditors(editor => {
					const {nullGrammar} = atom.grammars;
					const path = editor.getPath();
					if(isMagical.test(path) && nullGrammar === editor.getGrammar())
						this.assignGrammar(editor);
				})
			);
		});
	},
	
	deactivate(){
		this.grammar = null;
		if(this.disposables){
			this.disposables.dispose();
			this.disposables = null;
		}
	},
	
	assignGrammar(editor){
		editor.setGrammar(this.grammar);
		atom.textEditors.setGrammarOverride(editor, scopeName);
	},
	
	waitToLoad(){
		return new Promise(resolve => {
			let grammar = atom.grammars.grammarForScopeName(scopeName);
			
			if(grammar)
				resolve(grammar);
			
			else{
				const disposables = new CompositeDisposable();
				const handler = () => {
					grammar = atom.grammars.grammarForScopeName(scopeName);
					if(grammar){
						disposables.dispose();
						resolve(grammar);
					}
				};
				
				disposables.add(
					atom.packages.onDidActivatePackage(handler),
					atom.packages.onDidActivateInitialPackages(handler)
				);
			}
		});
	}
};
