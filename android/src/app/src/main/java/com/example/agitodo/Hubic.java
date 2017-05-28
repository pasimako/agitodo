package com.example.agitodo;

import java.util.ArrayList;
import java.util.List;

import org.apache.http.message.BasicNameValuePair;
import org.apache.http.NameValuePair;

import android.net.Uri;

public class Hubic {
    static final String CREDENTIALS_ENDPOINT = "https://api.hubic.com/1.0/account/credentials";

    static Logger log = new Logger();

    String token;

    public Hubic(String token) {
        this.token = token;
    }

    public Request.Response credentials() {
        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer " + token));

        return new Request(Request.GET, Uri.parse(CREDENTIALS_ENDPOINT), headers)
                .send(null);
    }

    public Request.Response getObject(String endpoint, String resource_path) {
        while (endpoint.endsWith("/")) {
            endpoint = endpoint.substring(0, endpoint.length() - 1);
        }

        while (resource_path.startsWith("/")) {
            resource_path = resource_path.substring(1);
        }

        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("X-Auth-Token", token));

        Uri.Builder uriBuilder = Uri.parse(endpoint + "/" + resource_path)
                .buildUpon();
        uriBuilder.appendQueryParameter("format", "json");

        return new Request(Request.GET, uriBuilder.build(), headers).send(null);
    }

    public Request.Response putObject(String endpoint, String resource_path,
                                      String content) {
        while (endpoint.endsWith("/")) {
            endpoint = endpoint.substring(0, endpoint.length() - 1);
        }

        while (resource_path.startsWith("/")) {
            resource_path = resource_path.substring(1);
        }

        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("X-Auth-Token", token));
        headers.add(new BasicNameValuePair("Content-Type",
                "text/plain; charset=utf-8"));

        return new Request(Request.PUT, Uri.parse(endpoint + "/" + resource_path),
                headers).send(content);
    }
}
