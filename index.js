"use strict";

const {CompositeDisposable} = require("atom");
const {resolve, sep} = require("path");
const SCOPE_NAME = "text.file-magic";


module.exports = {
	activated:   false,
	disposables: null,
	pathPattern: null,
	grammar:     null,
	
	activate(){
		this.disposables = new CompositeDisposable(
			atom.config.observe("language-file-magic.paths", paths => {
				this.pathPattern = new RegExp(paths.map(path => {
					path = resolve(path);
					if(!/\*/.test(path)) path += sep + "*";
					return path
						.replace(/[\\\/]+/g, sep)
						.replace(/\*+/g, "\u274B")
						.replace(/[/\\^$*+?{}\[\]().|]/g, "\\$&")
						.replace(/\u274B+/g, "[-.\\w]+") + "$";
				}).join("|"), "i");
				
				const {editors} = atom.textEditors;
				if(this.activated && editors)
					editors.forEach(ed => enchant(ed));
			})
		);
		this.waitToLoad().then(grammar => {
			this.grammar = grammar;
			this.disposables.add(
				atom.workspace.observeTextEditors(ed => this.enchant(ed))
			);
		});
		atom.textEditors.editors.forEach(editor => {
			const gram = editor.getGrammar();
			if(gram && SCOPE_NAME === gram.scopeName)
				editor.setTabLength(8);
		});
		this.activated = true;
	},
	
	deactivate(){
		if(this.disposables)
			this.disposables.dispose();
		this.disposables = null;
		this.grammar     = null;
		this.activated   = false;
	},
	
	enchant(editor){
		if(!editor) return;
		const isMagical = this.pathPattern.test(editor.getPath());
		const override = atom.textEditors.getGrammarOverride(editor);
		if(isMagical && (!override || SCOPE_NAME === override)){
			editor.setGrammar(this.grammar);
			atom.textEditors.setGrammarOverride(editor, SCOPE_NAME);
		}
		else if(!isMagical && SCOPE_NAME === override)
			atom.textEditors.clearGrammarOverride(editor);
	},
	
	waitToLoad(){
		return new Promise(resolve => {
			let grammar = atom.grammars.grammarForScopeName(SCOPE_NAME);
			
			if(grammar)
				resolve(grammar);
			
			else{
				const disposables = new CompositeDisposable();
				const handler = () => {
					grammar = atom.grammars.grammarForScopeName(SCOPE_NAME);
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
