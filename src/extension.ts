import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument} from 'vscode';

export function activate(context: ExtensionContext)
{
    let binaryTool = new BinaryTool();
    let controller = new BinaryToolController(binaryTool);

    context.subscriptions.push(controller);
    context.subscriptions.push(binaryTool);
}

class BinaryTool {

    private _statusBarItem: StatusBarItem;

    public updateStatusBar() 
    {
        // Create as needed
        if (!this._statusBarItem) 
        {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) 
        {
            this._statusBarItem.hide();
            return;
        }

        // Get selected string
        let selectedString = editor.document.getText(editor.selection);

        // Update the status bar
        this._statusBarItem.text = this.parseSelectedString(selectedString);
        this._statusBarItem.show();
    }

    private parseSelectedString(str: string)
    {
        let result = "";

        if (str.match("^[0-9a-fA-F]+$"))
        {
            result += str + ":";
            let signedNumber = this.byteString2Number(str, true);
            let unsignedNumber = this.byteString2Number(str, false);
            result += "  s:" + signedNumber.toString();
            result += "  u:" + unsignedNumber.toString();

            if (str.length == 8)
            {
                let floatNumber = this.bytes2Float32(unsignedNumber);
                result += "  f:" + floatNumber.toString();
            }
        }

        return result;
    }

    private hexChar2Number(char: string)
    {
        let num = 0;
    
        if (char >= '0' && char <= '9')
            num = char.charCodeAt(0) - '0'.charCodeAt(0);
        else if (char >= 'a' && char <= 'f')
            num = char.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
        else if (char >= 'A' && char <= 'F')
            num = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    
        return num;
    }

    private byteString2Number(str: string, isSigned:boolean)
    {
        let len = str.length;
        var negative = false;

        if (isSigned)
        {
            if (str[0] == '8' || str[0] == '9' || (str[0] >= 'a' && str[0] <= 'f') || (str[0] >= 'A' && str[0] <= 'F'))
                negative = true;
        }
        
        var num = this.hexChar2Number(str[0]);
    
        for (var i = 1; i < len; i++) 
        {
            var newNum = this.hexChar2Number(str[i]);
    
            num = 16 * num + newNum;
        }

        if (isSigned && negative)
        {
            num -= Math.pow(2, 4*len);
        }
    
        return num;
    }

    private bytes2Float32(bytes: number) 
    {
        var sign = (bytes & 0x80000000) ? -1 : 1;
        var exponent = ((bytes >> 23) & 0xFF) - 127;
        var significand = (bytes & ~(-1 << 23));
    
        if (exponent == 128)
            return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);
    
        if (exponent == -127) {
            if (significand == 0) return sign * 0.0;
            exponent = -126;
            significand /= (1 << 22);
        } else significand = (significand | (1 << 23)) / (1 << 23);
    
        return sign * significand * Math.pow(2, exponent);
    }

    dispose() 
    {
        this._statusBarItem.dispose();
    }
}

class BinaryToolController
{
    private _binaryTool: BinaryTool;
    private _disposable: Disposable;

    constructor(wordCounter: BinaryTool)
    {
        this._binaryTool = wordCounter;

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        // update the counter for the current file
        this._binaryTool.updateStatusBar();

        // create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() 
    {
        this._disposable.dispose();
    }

    private _onEvent() 
    {
        this._binaryTool.updateStatusBar();
    }
}