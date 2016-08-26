"use strict";

const readline = require('readline');
const C = require('chalk');

class Wizard {
  
  constructor() {
    this.queueStack = [[]];
  }
  
  get(type, prompt, defaultVal, callback) {
    let queue = this.queueStack[this.queueStack.length - 1];
    queue.push({
      type: type,
      text: prompt,
      defaultValue: defaultVal,
      callback: callback
    });
  }
  
  getText(prompt, defaultVal, callback) {
    this.get('text', prompt, defaultVal, callback);
  }
  
  getBool(prompt, defaultVal, callback) {
    this.get('bool', prompt, defaultVal, callback);
  }
  
  getNumber(prompt, defaultVal, callback) {
    this.get('number', prompt, defaultVal, callback);
  }
  
  done() {
    if(this.completionHandler) {
      this.completionHandler();
    }
  }
  
  error(text) {
    console.log(C.red(text));
    return false;
  }
  
  next() {
    let item, queue;
    this.queueStack = this.queueStack.filter((queue) => queue.length > 0);
    if(this.queueStack.length === 0) {
      // Done!
      return this.done();
    } else {
      queue = this.queueStack[this.queueStack.length - 1];
      item = queue[0];
    }
    
    let defaultValue = item.defaultValue && item.defaultValue.call ? item.defaultValue() : item.defaultValue;
    let defaultValueLabel = defaultValue;
    if(item.type === 'bool') {
      if(defaultValueLabel === true) {
        defaultValueLabel = "Y";
      } else {
        defaultValueLabel = "N";
      }
    }
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(`\n${C.cyan(item.text)}\n[${C.yellow(defaultValueLabel)}] > `, (answer) => {
      rl.close();
      let isValid = true;
      if(answer.length === 0) {
        answer = defaultValue;
      }
      if(item.type === 'number') {
        answer = Number(answer);
        if(isNaN(answer)) {
          isValid = false;
        }
      } else if(item.type === 'bool') {
        if(typeof answer == "string") {
          if(answer.match(/(y|ye|yes)/i)) {
            answer = true;
          } else if(answer.match(/(n|no)/i)) {
            answer = false;
          } else {
            answer = defaultValue ? true : false;
          }
        }
      }
      if(!isValid) {
        // Not valid. Reprompt
        this.next();
      } else {
        this.pushQueue();
        let result = item.callback(answer);
        if(result && result.then) {
          // Returned a promise. Run the promise then continue.
          result.then(() => {
            queue.shift();
            this.next();
          }).catch((err) => {
            if(err) {
              throw err;
            } else {
              this.next();
            }
          });
        } else if(result === false) {
          // Callback returned false, there must be an issue. Reprompt!
          this.next();
        } else {
          // All fine
          queue.shift();
          this.next();
        }
      }
    });
    
  }
  
  pushQueue() {
    this.queueStack.push([]);
  }
  
  begin(complete) {
    this.next();
    this.completionHandler = complete;
  }
  
}

module.exports = Wizard;