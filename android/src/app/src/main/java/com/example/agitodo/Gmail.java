package com.example.agitodo;

import java.util.ArrayList;
import java.util.List;

import android.net.Uri;
import android.util.Base64;

import java.lang.StringBuffer;

import org.apache.http.message.BasicNameValuePair;
import org.apache.http.NameValuePair;

public class Gmail {
    static final int MAX_EMAIL_LENGTH = 254;
    static final int MIN_EMAIL_LENGTH = 3;
    static final String SEND_ENDPOINT = "https://www.googleapis.com/upload/gmail/v1/users/me/messages/send";

    static Logger log = new Logger();

    String access_token;

    public Gmail(String access_token) {
        this.access_token = access_token;
    }

    public String rawMessage(String to, String subject, String body) {
        StringBuffer lines = new StringBuffer();

        try {
            lines.append("To: <" + to + ">\r\n");
            lines.append("Subject: =?UTF-8?B?"
                    + Base64.encodeToString(subject.getBytes("UTF-8"), Base64.NO_WRAP)
                    + "?=\r\n");
            lines.append("Content-Type: text/html; charset=UTF-8\r\n");
            lines.append("Content-Transfer-Encoding: base64\r\n");
            lines.append("\r\n");
            lines
                    .append(Base64.encodeToString(body.getBytes("UTF-8"), Base64.DEFAULT));
        } catch (Exception e) {
            log.error(e.toString());
            return "";
        }

        return lines.toString();
    }

    public Request.Response send(String to, String subject, String content) {
        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer "
                + access_token));
        headers.add(new BasicNameValuePair("Content-Type", "message/rfc822"));

        String body = rawMessage(to, subject, content);

        Uri.Builder uriBuilder = Uri.parse(SEND_ENDPOINT).buildUpon();
        uriBuilder.appendQueryParameter("uploadType", "media");

        return new Request(Request.POST, uriBuilder.build(), headers).send(body);
    }
}
