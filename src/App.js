import React, { Component } from "react";
import logo from "./logo.png";
import {Map, InfoWindow, Marker, GoogleApiWrapper} from 'google-maps-react';

import "./App.css";
// import {createWallet} from './create-wallet';
let BITBOXSDK = require("bitbox-sdk/lib/bitbox-sdk").default;
let BITBOX = new BITBOXSDK({
  restURL: 'https://trest.bitcoin.com/v1/'
});

// create 256 bit BIP39 mnemonic
// let mnemonic = ''let mnemonic = BITBOX.Mnemonic.generate(256, BITBOX.Mnemonic.wordLists()[lang]);
let mnemonic = 'sister often rapid purity solution twice fame trade pumpkin clean coyote olive lonely cabin stick slush wealth rail decade pride goose source kid check';

// root seed buffer
let rootSeed = BITBOX.Mnemonic.toSeed(mnemonic);

// master HDNode
let masterHDNode = BITBOX.HDNode.fromSeed(rootSeed, "testnet");

// HDNode of BIP44 account
let account = BITBOX.HDNode.derivePath(masterHDNode, "m/44'/145'/0'");

// derive the first external change address HDNode which is going to spend utxo
let change = BITBOX.HDNode.derivePath(account, "0/0");

// get the cash address
let cashAddress = BITBOX.HDNode.toCashAddress(change);

const style = {
  width: '90%',
  height: '80%'
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mnemonic: mnemonic,
      hex: "",
      txid: ""
    };
  }

  state = {
    showingInfoWindow: false,
    activeMarker: {},
    selectedPlace: {},
  };

  handleClick() {
    console.log(cashAddress);
    BITBOX.Address.utxo(cashAddress).then(
      result => {
        console.log(result);

        if (!result[0]) {
          return;
        }
        // instance of transaction builder
        let transactionBuilder = new BITBOX.TransactionBuilder("testnet");
        // original amount of satoshis in vin
        let originalAmount = result[0].satoshis;

        // index of vout
        let vout = result[0].vout;

        // txid of vout
        let txid = result[0].txid;

        // add input with txid and index of vout
        transactionBuilder.addInput(txid, vout);

        // get byte count to calculate fee. paying 1 sat/byte
        let byteCount = BITBOX.BitcoinCash.getByteCount(
          { P2PKH: 1 },
          { P2PKH: 1 }
        );
        // 192
        // amount to send to receiver. It's the original amount - 1 sat/byte for tx size
        let sendAmount = originalAmount - byteCount;

        // add output w/ address and amount to send
        transactionBuilder.addOutput(cashAddress, sendAmount);

        // keypair
        let keyPair = BITBOX.HDNode.toKeyPair(change);

        // sign w/ HDNode
        let redeemScript;
        transactionBuilder.sign(
          0,
          keyPair,
          redeemScript,
          transactionBuilder.hashTypes.SIGHASH_ALL,
          originalAmount
        );

        // build tx
        let tx = transactionBuilder.build();
        // output rawhex
        let hex = tx.toHex();
        // this.setState({
        //   hex: hex
        // });
        console.log(hex);

        // sendRawTransaction to running BCH node
        BITBOX.RawTransactions.sendRawTransaction(hex).then(
          result => {
            // this.setState({
            //   txid: result
            // });
            console.log(result);
          },
          err => {
            console.log(err);
          }
        );
      },
      err => {
        console.log(err);
      }
    );
  }

  handleChange(event) {
    this.setState({value: event.target.value});
  }

  handleSubmit(event) {
    alert('A transaction happened: ' + this.state.value);
    event.preventDefault();
  }
  
  onMarkerClick = (props, marker, e) =>
    this.setState({
      selectedPlace: props,
      activeMarker: marker,
      showingInfoWindow: true
    });

    onMapClicked = (props) => {
      if (this.state.showingInfoWindow) {
        this.setState({
          showingInfoWindow: false,
          activeMarker: null
        })
      }
    };
  render() {
    let addresses = [];
    for (let i = 0; i < 10; i++) {
      let account = masterHDNode.derivePath(`m/44'/145'/0'/0/${i}`);
      addresses.push(
        <li key={i}>
          m/44&rsquo;/145&rsquo;/0&rsquo;/0/
          {i}: {BITBOX.HDNode.toCashAddress(account)}
        </li>
      );
    }
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Nearby Cash</h1>
        </header>
        <div className="App-content">
          {/* <button onClick={this.handleClick} >SEND</button> */}
          <form onSubmit={this.handleSubmit}>
          <label>
            BCH Public Address:
            <input type="text" value={this.state.value} onChange={this.handleChange} />
          </label>
          <input type="submit" value="Send Money" />
          </form>
          <Map google={this.props.google} zoom={14} style={style} className={'map'}>
            <Marker onClick={this.onMarkerClick}
                  name={'Current location'} />
            <Marker
                  onClick={this.onMarkerClick}
                  title={'The marker\'s title will appear as a tooltip.'}
                  name={'SOMA'}
                  position={{lat: 37.778519, lng: -122.405640}} 
                  icon={{
                    url: "bitcoin-cash-logo.png",
                  }}/>
                  
            <Marker
                  onClick={this.onMarkerClick}
                  name={'Dolores park'}
                  position={{lat: 37.759703, lng: -122.428093}} />
            <InfoWindow
            marker={this.state.activeMarker}
            visible={this.state.showingInfoWindow}>
              <div>
                <h1>User1</h1>
                <h3>pubAddress: bchtest:qz2mxw2hp67ld7q4w4tjrk5w3w9rkjqjcqzvmwd7nl</h3>
                <button onClick={this.handleClick} >Send</button>
              </div>
            </InfoWindow>
          </Map>
          
        </div>
      </div>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: ("AIzaSyBNYY6EH0wy4-HihsEPdGE2d7PBxOYSsu4")
})(App)
