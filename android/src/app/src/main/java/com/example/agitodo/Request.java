package com.example.agitodo;

import java.net.URI;
import java.net.URLEncoder;

import java.util.List;

import android.net.Uri;

import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.client.HttpClient;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.NameValuePair;
import org.apache.http.HttpEntityEnclosingRequest;
import org.apache.http.entity.StringEntity;
import org.apache.http.HttpResponse;
import org.apache.http.HttpEntity;
import org.apache.http.util.EntityUtils;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpPut;

public class Request {
    static final int GET = 0;
    static final int POST = 1;
    static final int PUT = 2;

    public class Response {
        int status = -1;
        String body = "";
    }

    static Logger log = new Logger();

    int method;
    List<NameValuePair> headers;

    HttpRequestBase req;
    HttpClient httpClient;
    String url;

    public Request(int method, Uri uri, List<NameValuePair> headers) {
        this.method = method;
        this.headers = headers;

        switch (method) {
            case GET:
                req = new HttpGet();
                break;
            case POST:
                req = new HttpPost();
                break;
            case PUT:
                req = new HttpPut();
                break;
        }

        httpClient = new DefaultHttpClient();
        url = uri.toString();
    }

    public Request(int method, String host, String path,
                   List<NameValuePair> headers, List<NameValuePair> params) {
        this.method = method;
        this.headers = headers;

        switch (method) {
            case GET:
                req = new HttpGet();
                break;
            case POST:
                req = new HttpPost();
                break;
            case PUT:
                req = new HttpPut();
                break;
        }

        httpClient = new DefaultHttpClient();

        Uri.Builder uriBuilder = new Uri.Builder();
        uriBuilder.scheme("https");
        uriBuilder.authority(host);
        uriBuilder.path(path);
        uriBuilder.encodedQuery(encodeQuery(params));

        url = uriBuilder.toString();
    }

    public Response send(String body) {
        Response response = new Response();

        log.info(method + ": " + url);

        try {
            req.setURI(new URI(url));

            if (headers != null) {
                for (int i = 0; i < headers.size(); i++) {
                    req.setHeader(headers.get(i).getName(), headers.get(i).getValue());
                }
            }

            if (body != null) {
                ((HttpEntityEnclosingRequest) req).setEntity(new StringEntity(body,
                        "UTF8"));
                //log.info(body);
            }

            HttpResponse res = httpClient.execute(req);

            response.status = res.getStatusLine().getStatusCode();

            HttpEntity entity = res.getEntity();

            if (entity != null) {
                response.body = EntityUtils.toString(entity);
            }
        } catch (Exception e) {
            log.error(e.toString());
        }

        log.info(Integer.toString(response.status) + " " + response.body);

        return response;
    }

    static String encodeQuery(List<NameValuePair> params) {
        if (params == null) {
            return "";
        }

        String str = "";

        for (int i = 0; i < params.size(); i++) {
            if (i > 0) {
                str += "&";
            }

            try {
                str += String.format("%s=%s",
                        URLEncoder.encode(params.get(i).getName(), "UTF8"),
                        URLEncoder.encode(params.get(i).getValue(), "UTF8"));
            } catch (Exception e) {
                log.error(e.toString());
            }
        }

        return str;
    }
}
