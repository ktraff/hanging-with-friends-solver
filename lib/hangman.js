Hangman = {}, Hangman.Models = {}, Hangman.Views = {}, Hangman.Collections = {};

$(function () {
	Hangman.Models.Letter = Backbone.Model.extend({});
	
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
            return letter !== '$' && token.indexOf(letter) === -1  && 
            	$('#exclude').val().indexOf(letter) === -1;
        },

        match: function (token, index, curNode, curWord) {
            var c = token.charAt(index);
            if (c === '*') {
                // check each possible word
                for (var key in curNode) {
                	if (this.isValidLetter(key, token)) {
	                    if (index === (token.length - 1) && this.isEndOfWord(curNode[key])) {
	                        this.trigger('match:found', new Hangman.Models.Match({ word: curWord + key }));
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
        	'click #match': 'onClickFindResults',
        	'click #reset': 'onClickReset',
            'keyup input#word': 'onEnterLetter'
        },

        initialize: function () {
        	_(this).bindAll('addMatch', 'onClickFindResults');
        	this.$el.find('#results').css('min-height', $(window).height() - $('#footer').height() - $('#top').height());
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
            this.lettersView = new Hangman.Views.Letters({
                el: '#letters'
            });
            this.lettersView.render();
        },
        
        addMatch: function (match) {
            this.matches.add(match);
        },
        
        findMatches: function (letters) {
        	this.matchesView.reset();
            this.wordFinder.match(letters, 0, this.wordFinder.get('words'), '');
            this.matchesView.render();
            this.lettersToGuessView.render(letters);
        },
        
        isValid: function (token) {
        	for (var i = 0; i < token.length; i++) {
        		var c = token.charCodeAt(i);
        		// any searchable token must contain at least one alphabetical character
        		if ((c > 64 && c < 91) || (c > 96 && c < 123)) {
        			return true;
        		}
        	}
        	return false;
        },

        onClickFindResults: function (event) {
        	var that = this;
        	var letters = this.lettersView.letters();
        	if (this.isValid(letters)) {
        		this.$el.find('#loading').show('fast', function () {
        			that.findMatches(letters);
        			setTimeout(function () { that.$el.find('#loading').hide(); }, 1000);
        		});
        	}
        	else {
        		var messageBox = new Hangman.Views.MessageBox({
        			message: 'Please enter at least one character in your word.',
        		});
        		messageBox.render();
        	}
        },
        
        onClickReset: function (event) {
        	this.lettersView.reset();
        },

        onEnterLetter: function (event) {
        	if ((event.keycode || event.which) === 13) { // enter
        		this.findMatches();
        	}
        }
    });

    Hangman.Views.Letters = Backbone.View.extend({
        events: {
        	'focusin': 'onFocusIn',
        	'keyup input.letter': 'onKeyUp'
        },    
    	
    	initialize: function () {
        	var that = this;
        	this.$parent = this.$el.closest('#lettersContainer');
        	_(this).bindAll('show');
        	$(window).resize(function (event) {
        		that.center();
        	});
        },
        
        center: function () {
        	this.$parent.css('left', $(window).width() / 2 - this.$parent.width() / 2 + 'px');
        },
        
        /**
         * gathers all of the letters a user has selected to be guessed
         */
        letters: function () {
        	var letters = '', valid = false;
        	var $holders = this.$el.find('.letter-holder');
        	var $holder, text;
        	for (var i = $holders.length - 1; i >= 0; i--) {
        		$holder = $($holders[i]);
        		text = $holder.text();
        		if (text.length !== 0) {
        			break;
        		}
        	}
        	for (var j = 0; j <= i; j++) {
        		$holder = $($holders[j]);
        		text = $holder.text();
        		if (text.length) { 
        			if (text === '?') { letters += '*'; }
        			else { letters += text; }
        		}
        		else { letters += '*'; }
        	}
        	return letters;
        },
        
        onFocusIn: function (event) {
        	this.$el.find('.letter-holder').removeClass('current');
        	$(event.target).siblings('.letter-holder').addClass('current');
        },
        
        onKeyUp: function (event) {
        	// deactivate any empty letter holders
        	var $holders = this.$el.find('.letter-holder');
        	var $holder, text;
        	for (var i = $holders.length - 1; i >= 0; i--) {
        		$holder = $($holders[i]);
        		text = $holder.text();
        		if (text.length === 0) {
        			$holder.addClass('inactive');
        		}
        		else { break; }
        	}
        	for ( ; i >= 0; i--) {
        		$holder = $($holders[i]);
        		text = $holder.text();
        		$holder.removeClass('inactive');
        		if (text === '') { // fill in blank tiles with '?'s
        			$holder.text('?');
        		}
        	}
        },
        
        render: function () {
            for (var i = 0; i < 8; i++) {
            	var container = this.make('div', { 'class': 'letterTile'});
            	this.$el.append(container);
        		var letterView = new Hangman.Views.Letter({ 
        			el: container,
        			model: new Hangman.Models.Letter({ id: i })
        		});
        		letterView.render();
        	}
            this.center();
            setTimeout(this.show, 500);
        },
        
        reset: function () {
        	var $holders = this.$el.find('.letter-holder');
        	$holders.text('');
        	this.$el.find('input').val('');
        	$holders.removeClass('current');
        	$holders.addClass('inactive');
        },
        
        show: function () {
        	this.$parent.show('drop', {
            	direction: 'up',
            	duration: 'slow',
            	easing: 'easeOutBounce', 
            });
        	this.$el.css('display', 'inline-block');
        }
    });
    
    Hangman.Views.Letter = Backbone.View.extend({
        events: {
        	'keyup input.letter': 'onKeyUp'
        },
        
        isBackspace: function (event) {
        	var which = (event.which || event.keyCode);
        	if (which === 8 /* backspace */ || which === 46 || which === 127 /* delete */) {
        		return true;
        	}
        	return false;
        }, 
        
        isCharacter: function (string) {
        	if (string.length > 0) {
	        	var charCode = string.charCodeAt(string.length - 1);
	        	if ((charCode > 64 && charCode < 91) || (charCode > 96 && charCode < 123) ||
	        			this.isSpace(string)) {
	        		return true;
	        	}
        	}
        	return false;
        },

        isSpace: function (string) {
        	if (string.length > 0) {
	        	var charCode = string.charCodeAt(string.length - 1);
	        	if (charCode === 32 /* space */ || charCode === 37 /* % */ || 
	        			charCode === 42 /* % */ || charCode === 63 /* % */) {
	        		return true;
	        	}
        	}
        	return false;
        },
        
        onKeyUp: function (event) {
        	var input = this.$el.find('input').val();
        	if (input.length) {
        		var character = input.charAt(input.length - 1)
	        	if (this.isCharacter(character)) {
	        		if (!this.isSpace(character)) {
	        			this.$el.find('.letter-holder').text(character);
	        		}
	        		else {
	        			this.$el.find('.letter-holder').text('?');
	        		}
	        	}
        	}
        	else if (this.isBackspace(event)) { // clear all text
        		this.$el.find('.letter-holder').text('');
        	}
        	this.$el.find('input').val('');
        },
    	
    	render: function () {
            this.$el.html(this.template({ id: this.model.get('id')}));
        },

        template: _.template($('#letterTemplate').html())
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
        	var token = token || '';
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
        
        data: function (token) {
        	var letterCount = this.countLetters(token);
        	return {
        		totalCount: letterCount.totalCount,
        		lettersToGuess: this.sort(letterCount.letterCount)
        	}
        },

        render: function (token) {
            this.$el.html(this.template(this.data(token)));
            this.$el.show();
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
    
    //---------------------------------------------------------------------
    // Displays a message to be displayed on the screen
    //---------------------------------------------------------------------
    Hangman.Views.MessageBox = Backbone.View.extend({
    	initialize: function () {
    		if (!this.el) {
    			this.$el = $('body').append(this.make('div', { id: 'messageBox', style: 'display: none;'}));
    			this.el = this.$el.selector;
    		}
    	},
    	
    	buttons: function () {
    		return {
    			Ok: function() {
    				$( this ).dialog( "close" );
    			}
    		}
    	},
    	
    	render: function () {
    		this.$el.empty();
    		this.$el.append(this.options.message || '');
    		this.$el.dialog({
    			modal: this.options.modal || false,
    			buttons: this.buttons(),
    			title: this.options.title || 'Message'
    		});
    	}
    });
    
    //---------------------------------------------------------------------
    // Displays a confirm dialog box to be displayed on the screen
    //---------------------------------------------------------------------
    Hangman.Views.ConfirmBox = Backbone.View.extend({
    	initialize: function () {
    		if (!this.el) {
    			this.$el = $('body').append(this.make('div', { id: 'confirmBox', style: 'display: none;'}));
    			this.el = this.$el.selector;
    		}
    	},
    	
    	buttons: function () {
    		var that = this;
    		return {
    			Cancel: function() {
    				if (typeof that.options.cancel === 'function') { that.options.cancel(); }
    				$( this ).dialog( "close" );
    			},
    			Ok: function() {
    				var result = true;
    				if (typeof that.options.ok === 'function') { result = that.options.ok(); }
    				if (result !== false) {
    					$( this ).dialog( "close" );
    				}
    			}
    		}
    	},
    	
    	render: function () {
    		var that = this;
    		this.$el.prepend(this.make('div', { 'class': 'message' }, this.model.get('message')));
    		this.$el.dialog($.extend({
    			beforeClose: function (event, ui) {
    				var result = true;
    				if (typeof that.options.beforeClose === 'function') { result = that.options.beforeClose(event, ui); }
    				return result;
    			},
    			modal: true,
    			buttons: this.buttons(),
    			title: 'Confirm'
    		}, this.options));
    	}
    }); 
});
