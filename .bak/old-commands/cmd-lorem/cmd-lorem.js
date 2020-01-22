module.exports = async ({ args: [amount] }) => {
  const Enquirer = require('enquirer')
  const { Prompt } = Enquirer
  const enquirer = new Enquirer()
  const { LoremIpsum } = require('lorem-ipsum')
  const chalk = require('chalk')
  const clipboardy = require('clipboardy')

  const cmdList = ['w', 's', 'p']
  const cmdJump = [3, 2, 1]
  const cmdLimit = [[1, 19], [1, 15], [1, 9]]
  const cmdMap = ['generateWords', 'generateSentences', 'generateParagraphs']

  const lorem = new LoremIpsum({
    sentencesPerParagraph: {
      max: 8,
      min: 6
    },
    wordsPerSentence: {
      max: 10,
      min: 6
    }
  })

  if (amount) {
    if (!/(w|s|p)[1-9]{1,2}/.test(amount)) {
      console.log('Malformed command')
      return
    }

    const cmd = amount.slice(0, 1)
    const amountN = amount.slice(1)
    const index = cmdList.indexOf(cmd)
    console.log(cmd, index)
    const text = lorem[cmdMap[index]](
      between(Number(amountN), cmdLimit[index][0], cmdLimit[index][1])
    )
    clipboardy.writeSync(text)
    console.clear()
    console.log(`Copied "${text}"!`)
    return
  }

  function between(num, ...args) {
    const arg = args.sort()
    const first = arg[0]
    const last = arg[arg.length - 1]

    if (num < first) return first
    if (num > last) return last
    return num
  }

  function plural(amount, str) {
    return str + (amount > 1 ? 's' : '')
  }

  class Preview extends Prompt {
    constructor(options = {}) {
      super(options)
      this.value = ''
      this.cmdIndex = 0
      this.amountIndex = 1
      this.minAmount = 1
      this.maxAmount = 9
      this.first = true
      this.cursorHide()
    }

    changeAmount(forward) {
      if (typeof forward !== undefined) {
        this.amountIndex = between(
          this.amountIndex + (forward ? 1 : -1) * cmdJump[this.cmdIndex],
          cmdLimit[this.cmdIndex][0],
          cmdLimit[this.cmdIndex][1]
        )
      } else {
        this.amountIndex = between(
          this.amountIndex,
          cmdLimit[this.cmdIndex][0],
          cmdLimit[this.cmdIndex][1]
        )
      }
    }

    up() {
      this.changeAmount(true)
      this.render()
    }

    down() {
      this.changeAmount(false)
      this.render()
    }

    right() {
      this.cmdIndex = between(this.cmdIndex + 1, 0, cmdList.length - 1)
      this.changeAmount()
      this.render()
    }

    left() {
      this.cmdIndex = between(this.cmdIndex - 1, 0, cmdList.length - 1)
      this.changeAmount()
      this.render()
    }

    submit(...args) {
      this.last = true
      return super.submit()
    }

    render() {
      if (this.last) {
        return
      }
      if (this.first) {
        console.clear()
        this.first = false
      }
      this.clear()
      this.value = lorem[cmdMap[this.cmdIndex]](this.amountIndex)
      const name = plural(
        this.amountIndex,
        {
          w: 'word',
          s: 'sentence',
          p: 'paragraph'
        }[cmdList[this.cmdIndex]]
      )
      const msg = `Generating ${this.amountIndex} ${name} (${chalk.magenta(
        cmdList[this.cmdIndex] + this.amountIndex
      )}). [Enter to copy]
      
${this.value}`
      this.write(msg)
    }
  }

  enquirer.register('preview', Preview)

  const res = await enquirer
    .prompt([
      {
        type: 'preview',
        name: 'userAmount',
        message: 'How much lorem?'
      }
    ])
    .then(async ({ userAmount }) => {
      await wait(16)
      clipboardy.writeSync(userAmount)
      console.clear()
      console.log(`Copied "${userAmount}"!`)
    })
    .catch(err => {
      console.log(err)
    })
}

function wait(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}
