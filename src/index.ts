/**
 * Author: @dzuqe
 */

import MyAlgoConnect, {CallApplTxn} from '@randlabs/myalgo-connect';
import algosdk from 'algosdk';

class App {
  // main element
  elem: HTMLElement;

  // algorand data
  wallet: any;
  algodClient: any;
  accounts: any;
  addresses: any;
  appid: number = 296143611;

  // game data
  isConnected: boolean;
  globalState: object;
  localState: object;

  btns: HTMLElement;

  constructor() {
    this.elem = document.createElement('div');
    this.btns = document.createElement('div');
    this.elem.id = 'viewport';
    this.wallet = new MyAlgoConnect();

    // Private network
    //this.algodClient = new algosdk.Algodv2(
    //  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 
    //  'http://127.0.0.1', 
    //  '4001'
    //);

    // Open public algoexplorer node
    this.algodClient = new algosdk.Algodv2(
      '', 
      'https://api.algoexplorer.io', 
      ''
    );

    this.globalState = null;
    this.localState = null;
    this.elem.appendChild(this.btns);
  }

  /**
   * Connect to an algorand account via the MyAlgoConnect
   */
  async connect() {
    try {
      this.isConnected = true;
      this.accounts = await this.wallet.connect();
      this.addresses = this.accounts.map(account => account.address);

      this.readapp();

    } catch(err) {
      console.error(err);
    }
  }
  
  /**
   * Call the application
   */
  async callapp() {
    try {
      let txnn = await this.algodClient.getTransactionParams().do();
      let txn: CallApplTxn = {
        ...txnn,
        from: this.addresses[0],
        fee: 1000,
        flatFee: true,
        appIndex: this.appid,
        type: 'appl',
        appArgs: [btoa("take_shot")],
        appOnComplete: 0,
      };

      let signedTxn = await this.wallet.signTransaction(txn);
      await this.algodClient.sendRawTransaction(signedTxn.blob).do();
      this.readapp();
    } catch(err) {
      console.error(err);
    }
  }

  /**
   * Read the application
   * The data needs to be decoded from base64 to ASCII text
   */
  async readapp() {
    try {
      // read the global state
      let globalState = await this.algodClient.getApplicationByID(this.appid).do();
      var _global = {};
      for (var key in globalState.params['global-state']) {
        let r = globalState.params['global-state'][key];
        _global[atob(r.key)] = r.value;
      }
      console.log(_global);

      // read the local state
      let localState = await this.algodClient.accountInformation(this.addresses[0]).do();
      var local = {};
      for (var app in localState['apps-local-state']) {
        // check for our app
        if (localState['apps-local-state'][app]['id'] === this.appid) {
          for (var key in localState['apps-local-state'][app]['key-value']) {
            let r = localState['apps-local-state'][app]['key-value'][key];
            local[atob(r.key)] = r.value;
          }
        }
      }
      console.log(local);

      // check for differences
      if (this.globalState !== _global) {
        console.log("global state changed");
      }

      if (this.localState !== local) {
        console.log("local state changed");
      }

      // store recent state
      this.globalState = _global;
      this.localState = local;

      this.update();

    } catch (err) {
      console.error(err);
    }
  }

  async optin() {
    await this.opt(1);
    await this.readapp();
  }

  async optout() {
    await this.opt(2);
    await this.readapp();
  }

  async opt(action) {
    try {
      let txnn = await this.algodClient.getTransactionParams().do();
      let txn: CallApplTxn = {
        ...txnn,
        from: this.addresses[0],
        fee: 1000,
        flatFee: true,
        appIndex: this.appid,
        type: 'appl',
        appOnComplete: action,
      };

      let signedTxn = await this.wallet.signTransaction(txn);
      await this.algodClient.sendRawTransaction(signedTxn.blob).do();
      if (action === 1) {
        console.log("You have successfully opted in! You can now try your luck at winning tokens!");
      } else {
        console.log("You have successfully opted out! You won't be able to play anymore!");
      }
      this.readapp();
    } catch(e) {
      console.error(e.response.text);
      this.box.innerText = e.response.text;
    }
  }

  /**
   * Utilties
   */
  addbtn(btn: HTMLElement) {
    this.btns.appendChild(btn);
  }

  /**
   * Display the application
   */
  render() {
    document.getElementById("root").appendChild(this.elem);
  }
};

// main program
let app: App = new App();

let btn = document.createElement('button');
btn.id = "connect"
btn.innerText = "Connect Wallet";
btn.onclick = async function() {
  app.connect();
}

let callappbtn = document.createElement('button');
callappbtn.style.display = "none";
callappbtn.innerText = "Call App";
callappbtn.onclick = async function() {
  app.callapp();
}

app.addbtn(btn);
app.addbtn(callappbtn);

window['app'] = app; // debugging

app.render();
