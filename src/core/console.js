const CONSOLE_INFO = `
<div id="console">
<textarea style="width: 100%; height: 100%" readonly>
</div>
`;

export class ConsoleManager {
  consoleLog = '';

  log(...args) {
    this.consoleLog += args.map(this.parseLog).join(' ') + '\n';
    if ($('#console').length) {
      $('#console').find('textarea').text(this.consoleLog);
    }
  }

  error(...args) {
    this.consoleLog += args.map((e) => e.toString()).join(' ') + '\n';
    if ($('#console').length) {
      $('#console').find('textarea').text(this.consoleLog);
    }
  }

  parseLog(log) {
    if (typeof log === 'string') {
      return log;
    }
    try {
      return JSON.stringify(log, null, 2);
    } catch (e) {
      return String(log);
    }
  }

  showConsole() {
    if ($('#console').length) {
      $('#console').remove();
      return;
    }

    const consoleDiv = $(CONSOLE_INFO);
    consoleDiv.find('textarea').text(this.consoleLog);

    $('body').append(consoleDiv);
  }
}
