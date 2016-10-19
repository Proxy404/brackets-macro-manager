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
    
    
    function runMacro (arr, copiedText) {
        //console.log(arr);
        
        // Change arrow to green while the macro is running
        $('#macro-manager-run').addClass('macro-running');
        
        var editor = EditorManager.getFocusedEditor();
        var document = DocumentManager.getCurrentDocument();
        
        //console.log(document);
        
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
        
        // Loop through all of the actions in the array
        arr.forEach(function (item, index) {
            
            //console.log(item);
            
            // Preprocess the item codes 
            normalizeCodes(item);
            
            // Get the current cursor position for edits
            var pos = editor.getCursorPos();
            
            // if this key isn't an arrow key, clear the attempted character position
            if (item.code.indexOf('Arrow') == -1) {
                attemptedCharPos = -1;
            }
            
            
            if (item.code.indexOf('Arrow') > -1) {
                // The key pressed was one of the 4 arrow keys. Move the cursor accordingly
                
                //console.log('arrow key');
                
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
                    
                    case KeyEvent.DOM_VK_LEFT: // Left Arrow
                        
                        attemptedCharPos = - 1;
                        
                        var newPos = pos;
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
                    
                    case KeyEvent.DOM_VK_DOWN: // Down Arrow
                        
                        // Set the attempted character position if it wasn't set already
                        if (attemptedCharPos == -1) {
                            attemptedCharPos = pos.ch;
                        }
                        
                        // If SHIFT was held, highlight everything between current pos and new pos
                        // If there was already something selected immediately previous, use it's
                        // start or end depending on direction
                        if (item.shiftKey) {
                            
                            // Another caveat of the text editor is that if there is a selection of
                            // text and the user presses down or right the cursor is moved to the
                            // end of the selection and the event is consumed as in moving the
                            // cursor to the beginning is the only action done
                            
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
                            editor.setCursorPos(pos.line+1, attemptedCharPos);
                        }
                        
                        break;
                        
                    case KeyEvent.DOM_VK_RIGHT: // Right Arrow
                        attemptedCharPos = - 1;
                        
                        var newPos = pos;
                        // If the cursor is at the end of a line
                        if (pos.ch == document.getLine(pos.line).length) {
                            // Move the cursor to the beginning of the line below
                            newPos = {line: pos.line+1, ch: 0};
                            
                        } else {
                            newPos = {line: pos.line, ch: pos.ch+1};
                        }
                        
                        
                        // If SHIFT was held, highlight everything between current pos and new pos
                        // If there was already something selected immediately previous, use it's
                        // start or end depending on direction
                        if (item.shiftKey) {
                            
                            // Another caveat of the text editor is that if there is a selection of
                            // text and the user presses down or right the cursor is moved to the
                            // end of the selection and the event is consumed as in moving the
                            // cursor to the beginning is the only action done
                            
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
                            editor.setCursorPos(newPos.line, newPos.ch);
                        }
                        
                        break;
                }
                
                
            } else if (item.keyCode == KeyEvent.DOM_VK_RETURN) { // Enter
                //console.log('enter key');
                
                document.replaceRange('\n', pos);
                
            } else if (item.keyCode == KeyEvent.DOM_VK_BACK_SPACE) { // Backspace
                //console.log('back space key');
                if (pos.ch == 0 && pos.line != 0) {
                    
                    var txt = document.getLine(pos.line);
                    var len = document.getLine(pos.line-1).length;
                    
                    document.replaceRange(txt, {line: pos.line-1, ch: len}, {line: pos.line, ch: txt.length});
                    editor.setCursorPos({line: pos.line-1, ch: len});
                } else {
                    document.replaceRange('', {line: pos.line, ch: pos.ch-1}, pos);
                }
                
                
            } else if (item.keyCode == KeyEvent.DOM_VK_DELETE) { // Delete
                //console.log('delete key');
                var len = document.getLine(pos.line).length;
                
                // Get the number of rows in the document
                var rows = document.getText().split('\n').length;
                
                
                if (pos.ch == len && pos.line < rows) {
                    
                    var txt = document.getLine(pos.line+1);
                    var len = document.getLine(pos.line-1).length;
                    
                    document.replaceRange(txt, pos, {line: pos.line+1, ch: txt.length});
                    editor.setCursorPos(pos);
                } else {
                    document.replaceRange('', pos, {line: pos.line, ch: pos.ch+1});
                }
                
            } else if (item.keyCode == KeyEvent.DOM_VK_SPACE) { // Space
                //console.log('space key');
                document.replaceRange(' ', editor.getCursorPos());
                
                
            } else if (item.keyCode == KeyEvent.DOM_VK_END) { // End
                //console.log('end key');
                // Then End> key was pressed, get the length of the line and put the cursor at the end
                var pos = editor.getCursorPos();
                var len = document.getLine(pos.line).length;
                
                editor.setCursorPos(pos.line, len);
                
                
            } else if (item.keyCode == KeyEvent.DOM_VK_HOME) { // Home
                //console.log('home key');
                // Then <Home key was pressed, get the length of the line and put the cursor at the beginning
                
                
                // Check to see if there are any characters before the cursor
                // I there are, move the cursor directly infront of the first non-space
                // character. If all of the characters before the cursor are spaces,
                // go to the begining of the line. If the cursor is at the beginning
                // of the line and there are blank space characters to the right of it
                // find the first non-blank space charater and put the cursor to the
                // left of it.
                
                
                if (pos.ch == 0 ) {
                    
                    var txt = document.getLine(pos.line);
                    for (var x=0; x<txt.length; x++) {
                        if (txt[x] != ' ') {
                            editor.setCursorPos(pos.line, x);
                            break;
                        }
                    }
                    
                } else {

                    // Get the characters before the cursor
                    var txt = document.getLine(pos.line);
                    txt = txt.substr(0, pos.ch);

                    var allSpaces = true;

                    for (var x=0; x<txt.length; x++) {
                        if (txt[x] != ' ') {
                            allSpaces = false;
                            pos.ch = x;
                            break;
                        }
                    }

                    // Set the cursor
                    if (!allSpaces) {
                        editor.setCursorPos(pos.line, pos.ch);
                    } else {
                        editor.setCursorPos(pos.line, 0);
                    }
                }
                
                
            } else if (item.code.indexOf('Key') > -1) {
                //console.log('key key');
                if (item.ctrlKey) {
                    // The CTRL key was held during key press
                    
                    //console.log('ctrl+' + item.normalizedCode);
                    
                    if (item.keyCode == KeyEvent.DOM_VK_V) { // The user hit CTRL+v for paste
                        // Paste the stored text 
                        document.replaceRange(copiedText, pos);
                    }
                    
                } else if (item.shiftKey) {
                    // The SHIFT key was held during key press
                    
                    //console.log('shift+' + item.normalizedCode);
                    
                    document.replaceRange(item.normalizedCode.toUpperCase(), pos);
                    
                } else {
                    //console.log(item.normalizedCode);
                    
                    document.replaceRange(item.normalizedCode, pos);
                
                }
                
            }
            
        });
        
        // Change the arrow back to gray
        if ($('#macro-manager-run').hasClass('macro-running')) {
            setTimeout(function () {
                $('#macro-manager-run').removeClass('macro-running');
            }, 500);
        }
        
    }
    
    // Chop the code to get the simple string of what got pressed
    function normalizeCodes (item) {
        if (item.code.indexOf('Key') > -1) {
            item.normalizedCode = item.code.substr(3,1).toLowerCase();
        } else if (item.code.indexOf('Digit') > -1) {
            item.normalizedCode = item.code.substr(5,1).toLowerCase();
        } else if (item.code.indexOf('Arrow') > -1) {
            item.normalizedCode = item.code.substr(5,item.code.length).toLowerCase();
        } else {
            item.normalizedCode = item.code.toLowerCase();
        }
    }
    
    //console.log(KeyEvent);
    
    exports.runMacro = runMacro;
    
});