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
    
    var AppInit = brackets.getModule("utils/AppInit"),
        CommandManager = brackets.getModule("command/CommandManager"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        Menus = brackets.getModule("command/Menus"),
        MacroManager = require("MacroManager"),
        KeyEvent = brackets.getModule("utils/KeyEvent"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
    
    var recordMenuCommand, runMenuCommand = {};
    
    ExtensionUtils.loadStyleSheet(module, "MacroManager.css");
    
    // Menu functions
    
    /**
     * Begin recording key strokes, change menu items acordingly
     */
    function toggleRecordMacro () {
        
        console.log(recordMenuCommand.getName());
        
        if ($('#macro-manager-record').hasClass('macro-recording')) {
            $('#macro-manager-record').removeClass('macro-recording');
        } else {
            $('#macro-manager-record').addClass('macro-recording');
        }
        
        
        if (recordMenuCommand.getName() == "Record Macro") {
            
            // Change name of menu item to "Stop Recording"
            recordMenuCommand.setName("Stop Recording Macro");
            
            // Disable the run menu item
            runMenuCommand.setEnabled(false);
            
            // Begin recording keystrokes
            MacroManager.recordMacro();
            
        } else {
            
            // Change name of menu back to "Record Macro"
            recordMenuCommand.setName("Record Macro");
            
            // Re-enable the run menu item
            runMenuCommand.setEnabled(true);
            
            // Stop recording keystrokes
            MacroManager.stopRecordMacro();
            
        }
    };
    
    function runMacro () {
        MacroManager.runMacro();
    };
    
    
    //Register record command 
    var recordCommandID = "macromanager.record";
    CommandManager.register("Record Macro", recordCommandID, toggleRecordMacro);
    
    //Register run command 
    var runCommandID = "macromanager.run";
    CommandManager.register("Run Macro", runCommandID, runMacro);
    
    
    
    // We don't have direct access to Brackets' or the OS's clipboard so we need to create our own...
    // oh boy
    
    // There are some inherent problems:
    // 1. By the time any of my added events are fired, Brackets has already done it's thing
    //    meaning if the user presses CTRL+x for cut, Brackets has already added the selected text
    //    to the clipboard and removed it from the editor by the time my listener is fired. The
    //    text is gone and can't be retrieved because we don't currently (OCT 2016) have access to
    //    the clipboard.
    //
    // 2. Again, because we don't currently have access to the clipboard, I can only capture things
    //    that are copied within an editor in Brackets.
    
    
    function updateActiveEditor (EditorEvent, NewEditor, OldEditor) {
        
        if (OldEditor) {
            OldEditor.off('keyup.macromanager.copy', MacroManager.copyTextEventHandler);
        }
        
        if (NewEditor) {
            NewEditor.on('keyup.macromanager.copy', MacroManager.copyTextEventHandler);
        }
        
    }
    
    
    
    AppInit.appReady(function () {
        // Get the Edit menu to add macro items to
        var EditMenu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);

        // Add a divider
        EditMenu.addMenuDivider();

        // Add the Record menu item with shortcut
        // Retain menu item for changes
        recordMenuCommand = EditMenu.addMenuItem(recordCommandID, "Ctrl-Alt-F9").getCommand();

        // Add the Run menu item with shortcut
        runMenuCommand = EditMenu.addMenuItem(runCommandID, "Ctrl-Alt-F10").getCommand();
        
        //console.log('MacroManager Ready');
        
        // Initially set the listener to the current editor
        if (EditorManager.getFocusedEditor()) {
            EditorManager.getFocusedEditor().on('keyup.macromanager.copy', MacroManager.copyTextEventHandler);
        }
        
        // If the editor changes, make sure the copy listener is on the right one
        EditorManager.on('activeEditorChange.macromanager', updateActiveEditor);
        
        
        var recordMacroButton = $(document.createElement('a'))
            .attr('id', 'macro-manager-record')
            .attr('href', '#')
            .attr('title', 'Begin recording macro')
            .on('click', function () {
                console.log('begin record click');
                CommandManager.execute(recordCommandID);
            })
            .appendTo($("#main-toolbar .buttons"));
        
        var runMacroButton = $(document.createElement('a'))
            .attr('id', 'macro-manager-run')
            .attr('href', '#')
            .attr('title', 'Run the recorded macro')
            .on('click', function () {
                CommandManager.execute(runCommandID);
            })
            .appendTo($("#main-toolbar .buttons"));
        
    });
    
});