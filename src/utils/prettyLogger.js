import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Pretty Logger Utility
 * Provides beautiful terminal output for special messages
 */
export class PrettyLogger {
  /**
   * Display a beautiful startup banner
   */
  static startupBanner(port, environment, apiDocs) {
    const banner = boxen(
      chalk.cyan.bold('🚀 Hikaweb Backend Server') +
      '\n\n' +
      chalk.green('✅ Server Status: ') + chalk.white('Running') +
      '\n' +
      chalk.blue('📚 API Documentation: ') + chalk.underline.white(apiDocs) +
      '\n' +
      chalk.yellow('🌍 Environment: ') + chalk.white(environment) +
      '\n' +
      chalk.magenta('🕐 Started at: ') + chalk.white(new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Tehran',
        hour12: false 
      })) +
      '\n' +
      chalk.gray('─'.repeat(50)),
      {
        padding: 1,
        borderColor: 'cyan',
        borderStyle: 'round',
        title: 'Hikaweb Backend',
        titleAlignment: 'center'
      }
    );
    
    console.log('\n' + banner + '\n');
  }

  /**
   * Display connection status table
   */
  static connectionStatus(connections) {
    const statusLines = connections.map(conn => {
      const status = conn.status === 'success' 
        ? chalk.green('✅ Connected')
        : chalk.red('❌ Failed');
      return `${chalk.blue(conn.name.padEnd(15))} ${status}`;
    }).join('\n');

    const box = boxen(
      chalk.bold('📡 Connection Status\n') + '\n' + statusLines,
      {
        padding: 1,
        borderColor: 'blue',
        borderStyle: 'round'
      }
    );

    console.log(box);
  }

  /**
   * Display scheduler jobs list
   */
  static schedulerJobs(jobs) {
    const jobsList = jobs.map((job, index) => {
      return `${chalk.green('✓')} ${chalk.cyan(job.name.padEnd(30))} ${chalk.gray(job.interval)}`;
    }).join('\n');

    const box = boxen(
      chalk.bold('⏰ Scheduled Jobs\n') + '\n' + jobsList,
      {
        padding: 1,
        borderColor: 'yellow',
        borderStyle: 'round'
      }
    );

    console.log(box);
  }

  /**
   * Display success message
   */
  static success(message, details = null) {
    const msg = `${chalk.green('✅')} ${chalk.green.bold(message)}`;
    if (details) {
      console.log(msg + '\n' + chalk.gray(details));
    } else {
      console.log(msg);
    }
  }

  /**
   * Display error message
   */
  static error(message, details = null) {
    const msg = `${chalk.red('❌')} ${chalk.red.bold(message)}`;
    if (details) {
      console.log(msg + '\n' + chalk.red(details));
    } else {
      console.log(msg);
    }
  }

  /**
   * Display warning message
   */
  static warn(message, details = null) {
    const msg = `${chalk.yellow('⚠️')} ${chalk.yellow.bold(message)}`;
    if (details) {
      console.log(msg + '\n' + chalk.yellow(details));
    } else {
      console.log(msg);
    }
  }

  /**
   * Display info message
   */
  static info(message, details = null) {
    const msg = `${chalk.blue('ℹ️')} ${chalk.blue.bold(message)}`;
    if (details) {
      console.log(msg + '\n' + chalk.gray(details));
    } else {
      console.log(msg);
    }
  }

  /**
   * Display shutdown message
   */
  static shutdown(signal) {
    const banner = boxen(
      chalk.yellow.bold('🛑 Graceful Shutdown') +
      '\n\n' +
      chalk.gray(`Signal: ${signal}`) +
      '\n' +
      chalk.gray(`Time: ${new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Tehran',
        hour12: false 
      })}`),
      {
        padding: 1,
        borderColor: 'yellow',
        borderStyle: 'round'
      }
    );
    
    console.log('\n' + banner + '\n');
  }
}

