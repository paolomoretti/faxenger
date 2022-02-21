module.exports = {
  printMessage(data) {
    const { message, from } = data;
    console.log(`<<< PRINT JOB >>> `);
    console.log(`
======================================
From: ${from}
Message: ${message}
======================================
`);
    console.log(`<<< END PRINT >>>`)
  }
}
