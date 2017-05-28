package com.example.agitodo;

import java.util.ArrayList;
import java.util.List;

import org.apache.http.message.BasicNameValuePair;
import org.apache.http.NameValuePair;

import android.net.Uri;

public class Dropbox {
    static final String METADATA_ENDPOINT = "https://api.dropbox.com/1/metadata/sandbox";
    static final String FILE_GET_ENDPOINT = "https://api-content.dropbox.com/1/files/sandbox";
    static final String FILE_PUT_ENDPOINT = "https://api-content.dropbox.com/1/files_put/sandbox";

    static Logger log = new Logger();

    String access_token;

    public Dropbox(String access_token) {
        this.access_token = access_token;
    }

    public Request.Response file_get(String path) {
        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer "
                + access_token));

        return new Request(Request.GET, Uri.parse(FILE_GET_ENDPOINT + path),
                headers).send(null);
    }

    public Request.Response file_put(String path, String body) {
        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer "
                + access_token));
        headers.add(new BasicNameValuePair("Content-Type",
                "text/plain; charset=utf-8"));

        return new Request(Request.POST, Uri.parse(FILE_PUT_ENDPOINT + path),
                headers).send(body);
    }
}
