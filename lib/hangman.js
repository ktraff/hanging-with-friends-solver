Hangman = {}, Hangman.Models = {}, Hangman.Views = {}, Hangman.Collections = {};

$(function () {
	Hangman.Models.Match = Backbone.Model.extend({});
	
	Hangman.Collections.Matches = Backbone.Collection.extend({
		comparator: function (match) {
			var value = 0;
			for (var i = 0; i < match.length; i++) {
				value += match.charCodeAt(i);
			}
			return value;
		},
		
		model: Hangman.Models.Match,
	});
	
	Hangman.Models.Trie = Backbone.Model.extend({
	    defaults: {
	    	loaded: false,
	    	matches: new Hangman.Collections.Matches(),
	    	words: {}
	    },
	    
	    initialize: function () {
	        this.buildTrie();
	    },
	    
	    buildTrie: function (words) {
	    	var that = this, start = 0, end = 10000;
	        words = words || Hangman.words;
	        var index = 0;
	        while (index < Hangman.words.length) {
	        	// break up the insertion of words into groups to prevent browser crashing
	        	this.insertWords(Hangman.words, index, index + 10000);
	        	index += 10000;
	        }
	        this.set('loaded', true);
	    },
	    
	    insertWords: function (words, start, end) {
    		for (var i = start, j = end; i < j; i++) {
	            this.insertWord(words[i]);
	        }
	    },
	    
	    insertWord: function (word) {
	        if (word && word.length) {
	            var curNode = this.get('words');
	            var i = 0;
	            while (i < word.length) {
	            	var c = word[i];
	            	if (typeof curNode[c] === 'undefined') {
	            		// create a new node (0 = end of word, {} otherwise)
	            		curNode = curNode[c] = i === word.length - 1 ? 1 : {};
	            	}
	            	else if (curNode[c] === 1) {
	            		// if a complete word already exists, create an object to continue
	            		curNode = curNode[c] = { $: 1 };
	            	} else {
	                	curNode = curNode[c];
	            	}
	            	i++;
	            }
	        }
	    },
	    
	    isEndOfWord: function (node) {
	    	return node === 1 || node.$ === 1;
	    },
	    
	    match: function (token, index, curNode, curWord) {
	        var c = token.charAt(index);
	        if (curNode[c]) {
		        if (index === token.length - 1 && this.isEndOfWord(curNode)) {
		        	this.get('matches').add(curWord + curNode[c]);
		        }
		        else {
		        	return this.match(token, ++index, curNode[c], curWord + c);
		        }
	        }
	    },
	    
	    reset: function () {
	    	this.get('matches').reset();
	    }
	});
	
	Hangman.Models.Token = Backbone.Model.extend({
    });
    
    Hangman.Views.App = Backbone.View.extend({
        events: {
        	'click #findResults': 'onClickFindResults',
            'keyup input#word': 'onEnterLetter'
        },
        
        initialize: function () {
            this.wordFinder = new Hangman.Models.Trie();
        },
        
        onClickFindResults: function (event) {
        	this.wordFinder.reset();
        	this.wordFinder.match($('input#word').val(), 0, this.wordFinder.get('words'), '');
        },
        
        onEnterLetter: function (event) {
            
        }
    });
});
