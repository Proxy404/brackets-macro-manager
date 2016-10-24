/*
 * Copyright (c) 2016 Austin Markiewicz. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define */
define(function (require, exports, module) {
    "use strict";
    
    var EditorManager = brackets.getModule("editor/EditorManager"),
        KeyEvent = brackets.getModule("utils/KeyEvent"),
        DocumentManager = brackets.getModule("document/DocumentManager");
        
    // used for debugging the runner
    var debugSwitch = true;
    var debugLevel = 3;
    
    
    function runMacro (arr, copiedText) {
        //debug(arr);
        
        // Change arrow to green while the macro is running
        $('#macro-manager-run').addClass('macro-running');
        
        var editor = EditorManager.getFocusedEditor();
        var document = DocumentManager.getCurrentDocument();
        
        //debug(document);
        
        // This variable is used to replicate the standard cursor activity
        // If the user is in character position 16 and presses the up arrow, the cursor attempts
        // to move to the character position 16 on the above line, if the line is not at least
        // 16 characters long, it moves to the end. This is taken care of by default. However,
        // if the user presses the up key directly after, the cursor will still again try to go
        // to the character position 16, which is not handled using the document methods. This
        // variable will store the attempted character position as long as no other keys are 
        // pressed between the arrows. -1 means no arrow key was pressed before the current key
        // press.
        var attemptedCharPos = -1;
        
        debug(arr, 3);
        debug(arr.length, 3);
        
        // Loop through all of the actions in the array
        arr.forEach(function (item, index) {
            
            debug(item, 0);
            
            // Preprocess the item codes 
            normalizeCodes(item);
            
            // Get the current cursor position for edits
            var pos = editor.getCursorPos();
            
            debug('item.code', 2);
            debug(item.code, 2);
            
            // if this key isn't an arrow key, clear the attempted character position
            if (item.code.indexOf('Arrow') == -1) {
                attemptedCharPos = -1;
            }
            
            
            if (item.code.indexOf('Arrow') > -1) {
                // The key pressed was one of the 4 arrow keys. Move the cursor accordingly
                
                debug('arrow key');
                
                switch(item.keyCode) {
                    
                    case KeyEvent.DOM_VK_UP: // Up Arrow
                        // Move the cursor up one line
                        
                        // Set the attempted character position if it wasn't set already
                        if (attemptedCharPos == -1) {
                            attemptedCharPos = pos.ch;
                        }
                        
                        
                        // If SHIFT was held, highlight everything between current pos and new pos
                        // If there was already something selected immediately previous, use it's
                        // start or end depending on direction
                        if (item.shiftKey) {
                            
                            // Check to see if there is already text selected
                            if (editor.hasSelection()) {
                                
                                // Current selection coords
                                var sel = editor.getSelection();
                                
                                // Use a different start point if the selection was reversed
                                if (sel.reversed) {
                                    editor.setSelection(sel.end, {line: pos.line-1, ch: pos.ch});
                                } else {
                                    editor.setSelection(sel.start, {line: pos.line-1, ch: pos.ch});
                                }
                                
                            } else {
                                // No previous selection, so create one from the current cursor
                                // position to the new one
                                editor.setSelection(pos, {line: pos.line-1, ch: pos.ch});
                            }
                            
                        } else {
                            
                            // Another caveat of the text editor is that if there is a selection of
                            // text and the user presses up or left the cursor is moved to the
                            // beginning of the selection and the event is consumed as in moving the
                            // cursor to the beginning is the only action done
                            
                            // Check to see if something is selected, if it is use the start of that
                            if (editor.hasSelection()) {
                                // Current selection coords
                                var sel = editor.getSelection();
                                
                                // Use a different start point if the selection was reversed
                                if (sel.reversed) {
                                    editor.setCursorPos(sel.end.line, sel.end.ch);
                                } else {
                                    editor.setCursorPos(sel.start.line, sel.start.ch);
                                }
                                
                            } else {
                            
                                // Nothing special to do, just an up arrow key press
                                editor.setCursorPos(pos.line - 1, attemptedCharPos);
                            }
                        }
                        break;
                    
                    case KeyEvent.DOM_VK_RIGHT: // Right Arrow
                        attemptedCharPos = -1;
                        
                        var newPos = {line: pos.line, ch: pos.ch};
                        // If the cursor is at the end of a line
                        if (pos.ch == document.getLine(pos.line).length) {
                            // Set new position of the cursor to the beginning of the line below
                            newPos = {line: pos.line+1, ch: 0};
                        } else {
                            newPos = {line: pos.line, ch: pos.ch+1};
                        }
                        
                        
                        // If SHIFT was held, highlight everything between current pos and new pos
                        // If there was already something selected immediately previous, use it's
                        // start or end depending on direction
                        if (item.shiftKey) {
                            
                            // Check to see if there is already text selected
                            if (editor.hasSelection()) {
                                
                                // Current selection coords
                                var sel = editor.getSelection();
                                
                                // Use a different start point if the selection was reversed
                                if (sel.reversed) {
                                    editor.setSelection(sel.end, newPos);
                                } else {
                                    editor.setSelection(sel.start, newPos);
                                }
                                
                            } else {
                                editor.setSelection(pos, newPos);
                                
                            }
                            
                        } else if (item.ctrlKey) {
                            
                            // If CTRL was held during key press, jump the cursor to the end of 
                            // the current word if the character directly to the right is not a 
                            // space, or to the end of the next word if the character directly to
                            // the right is a space. If the cursor is at the end of the line,
                            // try to move it to the beginning of the next line
                            
                            if (pos.ch == document.getLine(pos.line).length) {
                                // Move the cursor to the beginning of the line below
                                editor.setCursorPos(newPos.line, newPos.ch);

                            } else {
                                
                                // Text from the line the cursor is on
                                var line = document.getLine(pos.line);
                                
                                var sawChar = false;
                                
                                for (var x=pos.ch; x<=document.getLine(pos.line).length; x++) {
                                    //debug(x + ' "' + line[x].trim() + '" ' + sawChar);
                                    
                                    if (x == document.getLine(pos.line).length) {
                                        // if the loop reached the end of the line put the cursor there
                                        newPos.ch = x;
                                        break;
                                    } else if (!sawChar && line[x].toString().trim() != "") {
                                        debug('setting sawChar true');
                                        sawChar = true;
                                    } else if (sawChar && line[x].toString().trim() == "") {
                                        debug('newPos.ch = '+x);
                                        newPos.ch = x;
                                        break;
                                    }
                                    
                                }
                                
                                editor.setCursorPos(newPos.line, newPos.ch);
                            }
                            
                        } else {
                            
                            // Another caveat of the text editor is that if there is a selection of
                            // text and the user presses down or right the cursor is moved to the
                            // end of the selection and the event is consumed as in moving the
                            // cursor to the beginning is the only action done
                            
                            // Check to see if something is selected, if it is use the end of that
                            if (editor.hasSelection()) {
                                // Current selection coords
                                var sel = editor.getSelection();
                                
                                // Use a different start point if the selection was reversed
                                if (sel.reversed) {
                                    editor.setCursorPos(sel.start.line, sel.start.ch);
                                } else {
                                    editor.setCursorPos(sel.end.line, sel.end.ch);
                                }
                                
                            } else {
                                editor.setCursorPos(newPos.line, newPos.ch);
                            }
                        }
                        
                        break;
                    
                    case KeyEvent.DOM_VK_DOWN: // Down Arrow
                        
                        // Set the attempted character position if it wasn't set already
                        if (attemptedCharPos == -1) {
                            attemptedCharPos = pos.ch;
                        }
                        
                        // If SHIFT was held, highlight everything between current pos and new pos
                        // If there was already something selected immediately previous, use it's
                        // start or end depending on direction
                        if (item.shiftKey) {
                            
                            // Check to see if there is already text selected
                            if (editor.hasSelection()) {
                                
                                // Current selection coords
                                var sel = editor.getSelection();
                                
                                // Use a different start point if the selection was reversed
                                if (sel.reversed) {
                                    editor.setSelection(sel.end, {line: pos.line+1, ch: pos.ch});
                                } else {
                                    editor.setSelection(sel.start, {line: pos.line+1, ch: pos.ch});
                                }
                                
                            } else {
                                editor.setSelection(pos, {line: pos.line+1, ch: pos.ch});
                            }
                            
                        } else {
                            // Another caveat of the text editor is that if there is a selection of
                            // text and the user presses up or left the cursor is moved to the
                            // beginning of the selection and the event is consumed as in moving the
                            // cursor to the beginning is the only action done
                            
                            // Check to see if something is selected, if it is use the start of that
                            if (editor.hasSelection()) {
                                // Current selection coords
                                var sel = editor.getSelection();
                                
                                // Use a different start point if the selection was reversed
                                if (sel.reversed) {
                                    editor.setCursorPos(sel.start.line, sel.start.ch);
                                } else {
                                    editor.setCursorPos(sel.end.line, sel.end.ch);
                                }
                                
                            } else {
                            
                                // Nothing special to do, just a down arrow key press
                                editor.setCursorPos(pos.line+1, attemptedCharPos);
                            }
                        }
                        
                        break;
                    
                    case KeyEvent.DOM_VK_LEFT: // Left Arrow
                        
                        attemptedCharPos = - 1;
                        
                        var newPos = {line: pos.line, ch: pos.ch};
                        // If the cursor is at the beginning of a line
                        if (pos.ch == 0) {
                            
                            // Move the cursor to the end of the line above
                            newPos = {line: pos.line-1, ch: document.getLine(pos.line-1).length};

                        } else if (pos.ch > 0) { // If the cursor has characters in front of it, move it

                            newPos = {line: pos.line, ch: pos.ch-1};

                        }
                        
                        
                        // If SHIFT was held, highlight everything between current pos and new pos
                        // If there was already something selected immediately previous, use it's
                        // start or end depending on direction
                        if (item.shiftKey) {
                            
                            // Check to see if there is already text selected
                            if (editor.hasSelection()) {
                                
                                // Current selection coords
                                var sel = editor.getSelection();
                                
                                // Use a different start point if the selection was reversed
                                if (sel.reversed) {
                                    editor.setSelection(sel.end, newPos);
                                } else {
                                    editor.setSelection(sel.start, newPos);
                                }
                                
                            } else {
                                editor.setSelection(pos, newPos);
                                
                            }
                            
                        } else if (item.ctrlKey) {
                            
                            // If CTRL was held during key press, jump the cursor to the end of 
                            // the current word if the character directly to the right is not a 
                            // space, or to the end of the next word if the character directly to
                            // the right is a space. If the cursor is at the end of the line,
                            // try to move it to the beginning of the next line
                            
                            if (pos.ch == document.getLine(pos.line).length) {
                                // Move the cursor to the beginning of the line below
                                editor.setCursorPos(newPos.line, newPos.ch);

                            } else {
                                
                                // Text from the line the cursor is on
                                var line = document.getLine(pos.line);
                                
                                var sawChar = false;
                                
                                for (var x=pos.ch-1; x>=0; x--) {
                                    
                                    debug(x + ' "' + line[x].toString().trim() + '" ' + sawChar);
                                    
                                    if (x == 0) {
                                        // if the loop reached the end of the line put the cursor there
                                        newPos.ch = 0;
                                        break;
                                    } else if (!sawChar && line[x].toString().trim() != "") {
                                        debug('setting sawChar true');
                                        sawChar = true;
                                    } else if (sawChar && line[x].toString().trim() == "") {
                                        debug('newPos.ch = '+x);
                                        newPos.ch = x+1;
                                        break;
                                    }
                                    
                                }
                                
                                editor.setCursorPos(newPos.line, newPos.ch);
                            }
                            
                        } else {
                            
                            // Another caveat of the text editor is that if there is a selection of
                            // text and the user presses up or left the cursor is moved to the
                            // beginning of the selection and the event is consumed as in moving the
                            // cursor to the beginning is the only action done
                            
                            // Check to see if something is selected, if it is use the start of that
                            if (editor.hasSelection()) {
                                // Current selection coords
                                var sel = editor.getSelection();
                                
                                // Use a different start point if the selection was reversed
                                if (sel.reversed) {
                                    editor.setCursorPos(sel.end.line, sel.end.ch);
                                } else {
                                    editor.setCursorPos(sel.start.line, sel.start.ch);
                                }
                                
                            } else {
                                editor.setCursorPos(newPos.line, newPos.ch);
                            }
                        }
                        
                        break;
                }
                
                
            } else if (item.keyCode == KeyEvent.DOM_VK_RETURN) { // Enter
                debug('enter key', 1);
                
                if (editor.hasSelection()) {
                    // Current selection coords
                    var sel = editor.getSelection();
                    // Use a different start point if the selection was reversed
                    if (sel.reversed) {
                        //editor.setCursorPos(sel.end, newPos);
                        document.replaceRange('\n', sel.end, sel.start);
                    } else {
                        //editor.setCursorPos(sel.start, newPos);
                        document.replaceRange('\n', sel.start, sel.end);
                    }
                    
                } else document.replaceRange('\n', pos);
                
            } else if (item.keyCode == KeyEvent.DOM_VK_BACK_SPACE) { // Backspace
                debug('back space key', 1);
                
                if (editor.hasSelection()) {
                    // Current selection coords
                    var sel = editor.getSelection();
                    // Use a different start point if the selection was reversed
                    if (sel.reversed) {
                        //editor.setCursorPos(sel.end, newPos);
                        document.replaceRange('', sel.end, sel.start);
                    } else {
                        //editor.setCursorPos(sel.start, newPos);
                        document.replaceRange('', sel.start, sel.end);
                    }
                    
                } else if (pos.ch == 0 && pos.line != 0) {
                    
                    var txt = document.getLine(pos.line);
                    var len = document.getLine(pos.line-1).length;
                    
                    document.replaceRange(txt, {line: pos.line-1, ch: len}, {line: pos.line, ch: txt.length});
                    editor.setCursorPos({line: pos.line-1, ch: len});
                } else {
                    document.replaceRange('', {line: pos.line, ch: pos.ch-1}, pos);
                }
                
                
            } else if (item.keyCode == KeyEvent.DOM_VK_DELETE) { // Delete
                debug('delete key', 1);
                
                var len = document.getLine(pos.line).length;
                
                // Get the number of rows in the document
                var rows = document.getText().split('\n').length;
                
                if (editor.hasSelection()) {
                    // Current selection coords
                    var sel = editor.getSelection();
                    // Use a different start point if the selection was reversed
                    if (sel.reversed) {
                        //editor.setCursorPos(sel.end, newPos);
                        document.replaceRange('', sel.end, sel.start);
                    } else {
                        //editor.setCursorPos(sel.start, newPos);
                        document.replaceRange('', sel.start, sel.end);
                    }
                    
                } else if (pos.ch == len && pos.line < rows) {
                    
                    var txt = document.getLine(pos.line+1);
                    var len = document.getLine(pos.line-1).length;
                    
                    document.replaceRange(txt, pos, {line: pos.line+1, ch: txt.length});
                    editor.setCursorPos(pos);
                } else {
                    document.replaceRange('', pos, {line: pos.line, ch: pos.ch+1});
                }
                
            } else if (item.keyCode == KeyEvent.DOM_VK_SPACE) { // Space
                debug('space key', 1);
                
                if (editor.hasSelection()) {
                    // Current selection coords
                    var sel = editor.getSelection();
                    // Use a different start point if the selection was reversed
                    if (sel.reversed) {
                        //editor.setCursorPos(sel.end, newPos);
                        document.replaceRange(' ', sel.end, sel.start);
                    } else {
                        //editor.setCursorPos(sel.start, newPos);
                        document.replaceRange(' ', sel.start, sel.end);
                    }
                    
                } else {
                    document.replaceRange(' ', editor.getCursorPos());
                }
                
                
            } else if (item.keyCode == KeyEvent.DOM_VK_END) { // End
                debug('end key', 1);
                
                // Then End> key was pressed, get the length of the line and put the cursor at the end
                
                var len = document.getLine(pos.line).length;
                
                var newPos = {line: pos.line, ch: len};
                
                if (item.shiftKey) {
                    // Check to see if there is already text selected
                    if (editor.hasSelection()) {

                        // Current selection coords
                        var sel = editor.getSelection();

                        // Use a different start point if the selection was reversed
                        if (sel.reversed) {
                            editor.setSelection(sel.end, newPos);
                        } else {
                            editor.setSelection(sel.start, newPos);
                        }

                    } else {
                        editor.setSelection(pos, newPos);

                    }
                } else {
                    editor.setCursorPos(pos.line, len);
                }
                
                
            } else if (item.keyCode == KeyEvent.DOM_VK_HOME) { // Home
                debug('home key', 1);
                
                // Then <Home key was pressed, get the length of the line and put the cursor at the beginning
                
                
                // Check to see if there are any characters before the cursor
                // I there are, move the cursor directly infront of the first non-space
                // character. If all of the characters before the cursor are spaces,
                // go to the begining of the line. If the cursor is at the beginning
                // of the line and there are blank space characters to the right of it
                // find the first non-blank space charater and put the cursor to the
                // left of it.
                
                var newPos = {line: pos.line, ch: pos.ch};
                
                debug(newPos);
                
                if (pos.ch == 0 ) {
                    
                    var txt = document.getLine(pos.line);
                    for (var x=0; x<txt.length; x++) {
                        if (txt[x].toString().trim() != '') {
                            newPos = {line: pos.line, ch: x};
                            break;
                        }
                    }
                    
                } else {

                    // Get the characters before the cursor
                    var txt = document.getLine(pos.line);
                    txt = txt.substr(0, pos.ch);

                    var allSpaces = true;

                    for (var x=0; x<txt.length; x++) {
                        if (txt[x].toString().trim() != '') {
                            allSpaces = false;
                            newPos.ch = x;
                            break;
                        }
                    }

                    // Set the cursor
                    if (allSpaces) {
                        newPos.ch = 0
                    }
                }
                
                // Shift key was held
                if (item.shiftKey) {
                    
                    // Check to see if there is already text selected
                    if (editor.hasSelection()) {

                        // Current selection coords
                        var sel = editor.getSelection();

                        // Use a different start point if the selection was reversed
                        if (sel.reversed) {
                            editor.setCursorPos(newPos.line, newPos.ch);
                            editor.setSelection(sel.start, newPos);
                        } else {
                            editor.setCursorPos(newPos.line, newPos.ch);
                            editor.setSelection(sel.end, newPos);
                        }

                    } else {
                        //debug('setting selection', 3);
                        editor.setSelection(newPos, pos);
                    }
                } else {
                    editor.setCursorPos(newPos.line, newPos.ch);
                }
                
                
            } else if (item.code.indexOf('Key') > -1) {
                debug('Key', 1);
                
                if (item.ctrlKey) {
                    // The CTRL key was held during key press
                    
                    //debug('ctrl+' + item.normalizedCode);
                    
                    if (item.keyCode == KeyEvent.DOM_VK_V) { // The user hit CTRL+v for paste
                        // Paste the stored text 
                        if (editor.hasSelection()) {
                            // Current selection coords
                            var sel = editor.getSelection();
                            // Use a different start point if the selection was reversed
                            if (sel.reversed) {
                                //editor.setCursorPos(sel.end, newPos);
                                document.replaceRange(copiedText, sel.end, sel.start);
                            } else {
                                //editor.setCursorPos(sel.start, newPos);
                                document.replaceRange(copiedText, sel.start, sel.end);
                            }

                        } else {
                            document.replaceRange(copiedText, pos);
                        }
                    }
                    
                } if (editor.hasSelection()) {
                    // Current selection coords
                    var sel = editor.getSelection();
                    // Use a different start point if the selection was reversed
                    if (sel.reversed) {
                        //editor.setCursorPos(sel.end, newPos);
                        document.replaceRange(item.normalizedCode, sel.end, sel.start);
                    } else {
                        //editor.setCursorPos(sel.start, newPos);
                        document.replaceRange(item.normalizedCode, sel.start, sel.end);
                    }
                    
                } else {
                    debug(item.normalizedCode);
                    
                    document.replaceRange(item.normalizedCode, pos);
                
                }
                
            } else if (item.code.indexOf('Digit') > -1) {
                
                debug('Digit', 1);
                
                if (editor.hasSelection()) {
                    // Current selection coords
                    var sel = editor.getSelection();
                    // Use a different start point if the selection was reversed
                    if (sel.reversed) {
                        //editor.setCursorPos(sel.end, newPos);
                        document.replaceRange(item.normalizedCode, sel.end, sel.start);
                    } else {
                        //editor.setCursorPos(sel.start, newPos);
                        document.replaceRange(item.normalizedCode, sel.start, sel.end);
                    }

                } else {
                    document.replaceRange(item.normalizedCode, pos);
                }
                
            } else {
                debug(item.normalizedCode, 1);
                
                if (editor.hasSelection()) {
                    // Current selection coords
                    var sel = editor.getSelection();
                    // Use a different start point if the selection was reversed
                    if (sel.reversed) {
                        //editor.setCursorPos(sel.end, newPos);
                        document.replaceRange(item.normalizedCode, sel.end, sel.start);
                    } else {
                        //editor.setCursorPos(sel.start, newPos);
                        document.replaceRange(item.normalizedCode, sel.start, sel.end);
                    }

                } else {
                    document.replaceRange(item.normalizedCode, pos);
                }
            }
        });
        
        // Change the run button back to gray
        if ($('#macro-manager-run').hasClass('macro-running')) {
            setTimeout(function () {
                $('#macro-manager-run').removeClass('macro-running');
            }, 500);
        }
        
        console.log('Macro run complete');
    }
    
    // Chop the code to get the simple string of what got pressed
    function normalizeCodes (item) {
        debug('normalizedCodes');
        debug(item);
        
        if (item.code.indexOf('Key') > -1) {
            if (item.shiftKey) {
                item.normalizedCode = item.code.substr(3,1).toUpperCase();
            } else {
                item.normalizedCode = item.code.substr(3,1).toLowerCase();
            }
            
        } else if (item.code.indexOf('Digit') > -1) {
            if (item.shiftKey) {
                switch (item.keyCode) {
                    case KeyEvent.DOM_VK_0: item.normalizedCode = ')'; break; // 0
                    case KeyEvent.DOM_VK_1: item.normalizedCode = '!'; break; // 1
                    case KeyEvent.DOM_VK_2: item.normalizedCode = '@'; break; // 2
                    case KeyEvent.DOM_VK_3: item.normalizedCode = '#'; break; // 3
                    case KeyEvent.DOM_VK_4: item.normalizedCode = '$'; break; // 4
                    case KeyEvent.DOM_VK_5: item.normalizedCode = '%'; break; // 5
                    case KeyEvent.DOM_VK_6: item.normalizedCode = '^'; break; // 6
                    case KeyEvent.DOM_VK_7: item.normalizedCode = '&'; break; // 7
                    case KeyEvent.DOM_VK_8: item.normalizedCode = '*'; break; // 8
                    case KeyEvent.DOM_VK_9: item.normalizedCode = '('; break; // 9
                    default: item.normalizedCode = item.code.substr(5,1).toLowerCase(); break;
                }
            } else {
                item.normalizedCode = item.code.substr(5,1).toLowerCase();
            }
            
        } else if (item.code.indexOf('Arrow') > -1) {
            item.normalizedCode = item.code.substr(5,item.code.length).toLowerCase();
        } else {
            
            if (item.shiftKey) {
                switch (item.keyCode) {
                    case KeyEvent.DOM_VK_DASH:          item.normalizedCode = '_'; break; // Shift+-
                    case KeyEvent.DOM_VK_EQUALS:        item.normalizedCode = '+'; break; // Shift+=
                    case KeyEvent.DOM_VK_OPEN_BRACKET:  item.normalizedCode = '{'; break; // Shift+[
                    case KeyEvent.DOM_VK_CLOSE_BRACKET: item.normalizedCode = '}'; break; // Shift+]
                    case KeyEvent.DOM_VK_SEMICOLON:     item.normalizedCode = ':'; break; // Shift+;
                    case KeyEvent.DOM_VK_QUOTE:         item.normalizedCode = '"'; break; // Shift+'
                    case KeyEvent.DOM_VK_COMMA:         item.normalizedCode = '<'; break; // Shift+,
                    case KeyEvent.DOM_VK_PERIOD:        item.normalizedCode = '>'; break; // Shift+.
                    case KeyEvent.DOM_VK_SLASH:         item.normalizedCode = '?'; break; // Shift+/
                    case KeyEvent.DOM_VK_BACK_QUOTE:    item.normalizedCode = '~'; break; // Shift+`
                    case KeyEvent.DOM_VK_BACK_SLASH:    item.normalizedCode = '|'; break; // Shift+\
                    default:                            item.normalizedCode = item.code.toLowerCase(); break;
                }
            } else {
                switch (item.keyCode) {
                    case KeyEvent.DOM_VK_DASH:          item.normalizedCode = '-'; break; // -
                    case KeyEvent.DOM_VK_EQUALS:        item.normalizedCode = '='; break; // =
                    case KeyEvent.DOM_VK_OPEN_BRACKET:  item.normalizedCode = '['; break; // [
                    case KeyEvent.DOM_VK_CLOSE_BRACKET: item.normalizedCode = ']'; break; // ]
                    case KeyEvent.DOM_VK_SEMICOLON:     item.normalizedCode = ';'; break; // ;
                    case KeyEvent.DOM_VK_QUOTE:         item.normalizedCode = '\''; break; // '
                    case KeyEvent.DOM_VK_COMMA:         item.normalizedCode = ','; break; // ,
                    case KeyEvent.DOM_VK_PERIOD:        item.normalizedCode = '.'; break; // .
                    case KeyEvent.DOM_VK_SLASH:         item.normalizedCode = '/'; break; // /
                    case KeyEvent.DOM_VK_BACK_QUOTE:    item.normalizedCode = '`'; break; // `
                    case KeyEvent.DOM_VK_BACK_SLASH:    item.normalizedCode = '\\'; break; // \
                    default:                            item.normalizedCode = item.code.toLowerCase(); break;
                }
            }
        }
    }
    
    function debug (obj) {
        if (debugSwitch) {
            console.log(obj);
        }
    }
    
    //debug(KeyEvent);
    
    exports.runMacro = runMacro;
    
});