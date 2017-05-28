var nodemailer = require("nodemailer");
var sendmailTransport = require("nodemailer-sendmail-transport");

var logger = require("./logger");

function send(from, to, subject, body, callback) {
  var transport = nodemailer.createTransport(sendmailTransport({
    path: "/usr/sbin/sendmail",
    args: ["-t", "-f", from]
  }));

  transport.sendMail({
    from: from,
    to: to,
    subject: subject,
    html: body
  }, function(error, response) {
    if (error) {
      logger.error({
        reason: error,
        from: from,
        to: to
      });

      return callback ? callback() : undefined;
    }

    transport.close();

    return callback ? callback(true) : undefined;
  });
}

function verify(email, token, callback) {
  var subject = "Agitodo: Email address verification";
  var link = "https://example.com/verify?email=" + encodeURIComponent(email) +
    "&token=" +
    encodeURIComponent(token);

  var body = "";
  body +=
    "It looks like you have created a new account on <a href='https://example.com'>Agitodo</a>.";
  body +=
    "<br><br>Please click on the link below to verify your email address:<br><a href='" +
    link + "'>" + link + "</a>";
  body +=
    "<br><br>If you haven't created a new account, you can safely ignore this message.";

  send("no-reply@example.com", email, subject, body, callback);
}

function contact(name, email, msg, callback) {
  var subject = "Agitodo contact form - " + new Date().getTime();
  var body = "Name:<br>" + name + "<br>Email:<br>" + email + "<br>Message:<br>" +
    msg.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

  send("no-reply@example.com", "contact@example.com", subject, body, callback);
}

module.exports = {
  contact: contact,
  verify: verify
};
