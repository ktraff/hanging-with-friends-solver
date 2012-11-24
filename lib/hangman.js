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

        isValidLetter: function (letter, token) {
            return letter !== '$' && token.indexOf(letter) === -1;
        },

        match: function (token, index, curNode, curWord) {
            var c = token.charAt(index);
            if (c === '*') {
                // check each possible word
                for (var key in curNode) {
                	if (this.isValidLetter(key, token)) {
	                    if (index === (token.length - 1) && this.isEndOfWord(curNode[key])) {
	                        this.trigger('added', new Hangman.Models.Match({ word: curWord + key }));
	                    }
	                    this.match(token, index + 1, curNode[key], curWord + key);
                	}
                }
            }
            else if (curNode[c]) {
                if (index === token.length - 1 && this.isEndOfWord(curNode[c])) {
                    this.trigger('match:found', new Hangman.Models.Match({ word: curWord + c }));
                }
                else {
                    this.match(token, ++index, curNode[c], curWord + c);
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
        	_(this).bindAll('addMatch');
        	this.wordFinder = new Hangman.Models.Trie();
            this.matches = new Hangman.Collections.Matches();
            this.matchesView = new Hangman.Views.Matches({
                el: '#matches',
                collection: this.matches
            });
            this.lettersToGuessView = new Hangman.Views.LettersToGuess({
                el: '#lettersToGuess',
                collection: this.matches
            });
            this.wordFinder.on('match:found', this.addMatch);
        },
        
        addMatch: function (match) {
            this.matches.add(match);
        },
        
        findMatches: function () {
        	this.matchesView.reset();
            this.wordFinder.match($('input#word').val(), 0, this.wordFinder.get('words'), '');
            this.matchesView.render();
            this.lettersToGuessView.render();
        },

        onClickFindResults: function (event) {
            this.findMatches();
        },

        onEnterLetter: function (event) {
        	if ((event.keycode || event.which) === 13) { // enter
        		this.findMatches();
        	}
        }
    });

    Hangman.Views.Matches = Backbone.View.extend({
        initialize: function () {
            
        },

        render: function () {
            this.$el.html(this.template({ matches: this.collection.toJSON() }));
        },

        reset: function () {
            this.$el.empty();
            this.collection.reset();
        },

        template: _.template($('#matchesTemplate').html())
    });
    
    Hangman.Views.LettersToGuess = Backbone.View.extend({
        initialize: function () {
           
        },
        
        countLetters: function (token) {
        	var letterCount = {}, totalCount = 0;
        	var token = token || $('input#word').val();
        	var tokenLetters = token.split('');
        	this.collection.each(function (match) {
        		var letters = match.get('word').split('');
        		for (var i = 0; i < letters.length; i++) {
        			if (tokenLetters[i] === '*') { // a "guessable" letter
	        			if (typeof letterCount[letters[i]] === 'undefined') {
	        				letterCount[letters[i]] = 1;
	        			}
	        			else {
	        				letterCount[letters[i]]++;
	        			}
	        			totalCount++;
        			}
        		}
        	});
        	return {
        		letterCount: letterCount,
        		totalCount: totalCount
        	};
        },
        
        data: function () {
        	var letterCount = this.countLetters();
        	return {
        		totalCount: letterCount.totalCount,
        		lettersToGuess: this.sort(letterCount.letterCount)
        	}
        },

        render: function () {
            this.$el.html(this.template(this.data()));
        },

        reset: function () {
            this.$el.empty();
            this.collection.reset();
        },
        
        sort: function (letters) {
        	var sortedLetters = [];
        	for (letter in letters) {
        		var insertAt = 0, inserted = false;
        		for (var i = 0; i < sortedLetters.length; i++) {
        			var sortedLetter = sortedLetters[i];
        			if (letters[letter] >= sortedLetter.value  && letter !== sortedLetter.letter) {
        				var letterObj = {
        					letter: letter,
        					value: letters[letter]
        				};
        				sortedLetters.splice(i, 0, letterObj);
        				inserted = true;
        				break;
        			}
        		}
        		if (!inserted) {
        			var letterObj = {
        				letter: letter,
        				value: letters[letter]
        			};
        			sortedLetters.push(letterObj);
        		}
        	}
        	return sortedLetters;
        },

        template: _.template($('#lettersToGuessTemplate').html())
    });
});
