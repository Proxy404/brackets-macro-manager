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
        MacroRunner = require("MacroRunner");
    
    var macroArray = [];
    var editor = {};
    
    // Array of keyboard keys to ignore
    // The modifier keys (CTRL, SHIFT, ALT, etc) are stored as booleans in the KeyboardEvent
    // so we don't want to record them, we can pull the boolean on playback
    var blacklist = [
        16,  // Shift
        17,  // Control
        18,  // Alt
        19,  // Pause/Break
        20,  // Caps Lock
        33,  // Page Up
        34,  // Page Down
        44,  // Print Screen
        91,  // Windows/Mac Key
        112, // F1
        113, // F2
        114, // F3
        115, // F4
        116, // F5
        117, // F6
        118, // F7
        119, // F8
        120, // F9
        121, // F10
        122, // F11
        123, // F12
        145  // Screen Lock
    ];
    
    
    // This will store the selected text when CTRL+c is pressed
    var copiedText = '';
    
    // This event handler will listen just for CTRL+c
    function copyTextEventHandler (BracketsEvent, Editor, KeyboardEvent) {
    
        if (KeyboardEvent.keyCode == KeyEvent.DOM_VK_C && KeyboardEvent.ctrlKey) {
            copiedText = Editor.getSelectedText(true);
        }
        
    }
    
    
    function recordMacro () {
        
        //console.log('copied text');
        //console.log(copiedText);
        
        // Clear the previous macro
        macroArray = [];
        
        // Get the current editor
        editor = EditorManager.getFocusedEditor();
        
        // Set the keyup listener
        editor.on('keydown.macromanager.record', function (BracketsEvent, Editor, KeyboardEvent) {
            
            // If the key is not in the blacklist, add it to the macroArray
            if (blacklist.indexOf(KeyboardEvent.keyCode) == -1) {
                //console.log(KeyboardEvent.keyCode);
                //console.log(editor.getSelection());
                macroArray.push(KeyboardEvent);
            }
            
        });
        
    };
    
    
    function stopRecordMacro () {
    
        //console.log("Stopped Recording");
        // Remove keypress listener
        editor.off('keydown.macromanager.record');
        //console.log(macroArray);
    };
    
    
    function runMacro () {
        console.log('Macro Run');
        MacroRunner.runMacro(macroArray, copiedText);
        
    };
    
    
    exports.recordMacro = recordMacro;
    exports.stopRecordMacro = stopRecordMacro;
    exports.runMacro = runMacro;
    exports.copyTextEventHandler = copyTextEventHandler;
    
    console.log(KeyEvent);
});