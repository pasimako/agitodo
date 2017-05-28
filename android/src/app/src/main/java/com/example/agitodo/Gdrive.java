package com.example.agitodo;

import java.util.ArrayList;
import java.util.List;

import android.net.Uri;

import org.apache.http.message.BasicNameValuePair;
import org.apache.http.NameValuePair;

public class Gdrive {
    static final String METADATA_ENDPOINT = "https://www.googleapis.com/drive/v2/files";
    static final String LIST_ENDPOINT = "https://www.googleapis.com/drive/v2/files";
    static final String DELETE_FILE_ENDPOINT = "https://www.googleapis.com/drive/v2/files";
    static final String NEW_FILE_ENDPOINT = "https://www.googleapis.com/upload/drive/v2/files";
    static final String UPDATE_FILE_ENDPOINT = "https://www.googleapis.com/upload/drive/v2/files";

    static Logger log = new Logger();

    String access_token;

    public Gdrive(String access_token) {
        this.access_token = access_token;
    }

    public Request.Response metadata(String fileId) {
        while (fileId.startsWith("/")) {
            fileId = fileId.substring(1);
        }

        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer "
                + access_token));

        return new Request(Request.GET,
                Uri.parse(METADATA_ENDPOINT + "/" + fileId), headers).send(null);
    }

    public Request.Response list(String filename) {
        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer "
                + access_token));

        List<NameValuePair> params = new ArrayList<NameValuePair>();
        params.add(new BasicNameValuePair("q",
                "'appdata' in parents and trashed=false"
                        + ((filename == "*") ? "" : " and title='" + filename + "'")));

        Uri.Builder uriBuilder = Uri.parse(LIST_ENDPOINT).buildUpon();
        uriBuilder.encodedQuery(Request.encodeQuery(params));

        return new Request(Request.GET, uriBuilder.build(), headers).send(null);
    }

    public Request.Response newFile(String filename, String content) {
        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer "
                + access_token));
        headers.add(new BasicNameValuePair("Content-Type",
                "multipart/related; boundary=\"part\""));

        StringBuffer body = new StringBuffer();
        body.append("--part");
        body.append("\n");
        body.append("Content-Type: application/json; charset=UTF-8");
        body.append("\n\n");
        body.append(String.format(
                "{\"title\":\"%s\",\"parents\":[{\"id\":\"appdata\"}]}", filename));
        body.append("\n\n");
        body.append("--part");
        body.append("\n");
        body.append("Content-Type: text/plain; charset=UTF-8");
        body.append("\n\n");
        body.append(content);
        body.append("\n\n");
        body.append("--part--");

        Uri.Builder uriBuilder = Uri.parse(NEW_FILE_ENDPOINT).buildUpon();
        uriBuilder.appendQueryParameter("uploadType", "multipart");

        return new Request(Request.POST, uriBuilder.build(), headers).send(body
                .toString());
    }

    public Request.Response updateFile(String fileId, String content) {
        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer "
                + access_token));
        headers.add(new BasicNameValuePair("Content-Type",
                "text/plain; charset=UTF-8"));

        Uri.Builder uriBuilder = Uri.parse(UPDATE_FILE_ENDPOINT + "/" + fileId)
                .buildUpon();
        uriBuilder.appendQueryParameter("uploadType", "media");

        return new Request(Request.PUT, uriBuilder.build(), headers).send(content);
    }

    public Request.Response getFile(String downloadUrl) {
        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Authorization", "Bearer "
                + access_token));

        return new Request(Request.GET, Uri.parse(downloadUrl), headers).send(null);
    }
}
