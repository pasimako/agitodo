package com.example.agitodo;

import java.util.List;
import java.util.ArrayList;

import android.net.Uri;

import org.apache.http.NameValuePair;
import org.apache.http.message.BasicNameValuePair;

public class OAuth {
    static final String OAUTH_REDIRECT_URI = "http://localhost:8081/oauth-code";

    static final String DROPBOX_APP_KEY = "DROPBOX_APP_KEY";
    static final String DROPBOX_APP_SECRET = "DROPBOX_APP_SECRET";

    static final String GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID";
    static final String GOOGLE_CLIENT_SECRET = "GOOGLE_CLIENT_SECRET";

    static final String HUBIC_CLIENT_ID = "HUBIC_CLIENT_ID";
    static final String HUBIC_CLIENT_SECRET = "HUBIC_CLIENT_SECRET";

    static final String DROPBOX_AUTH_ENDPOINT = "https://www.dropbox.com/1/oauth2/authorize";
    static final String GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/auth";
    static final String HUBIC_AUTH_ENDPOINT = "https://api.hubic.com/oauth/auth";

    static final String DROPBOX_TOKEN_ENDPOINT = "https://api.dropbox.com/1/oauth2/token";
    static final String GOOGLE_TOKEN_ENDPOINT = "https://accounts.google.com/o/oauth2/token";
    static final String HUBIC_TOKEN_ENDPOINT = "https://api.hubic.com/oauth/token";

    static final int PROVIDER_DROPBOX = 0;
    static final int PROVIDER_GDRIVE = 1;
    static final int PROVIDER_GMAIL = 2;
    static final int PROVIDER_HUBIC = 3;

    static Logger log = new Logger();

    int provider;
    String client_id;
    String client_secret;

    public OAuth(int provider) {
        this.provider = provider;

        switch (provider) {
            case PROVIDER_DROPBOX:
                this.client_id = DROPBOX_APP_KEY;
                this.client_secret = DROPBOX_APP_SECRET;
                break;
            case PROVIDER_GDRIVE:
            case PROVIDER_GMAIL:
                this.client_id = GOOGLE_CLIENT_ID;
                this.client_secret = GOOGLE_CLIENT_SECRET;
                break;
            case PROVIDER_HUBIC:
                this.client_id = HUBIC_CLIENT_ID;
                this.client_secret = HUBIC_CLIENT_SECRET;
                break;
        }
    }

    public String authURL() {
        String endpoint = "";
        List<NameValuePair> params = new ArrayList<NameValuePair>();

        params.add(new BasicNameValuePair("response_type", "code"));
        params.add(new BasicNameValuePair("redirect_uri", OAUTH_REDIRECT_URI));
        params.add(new BasicNameValuePair("client_id", client_id));

        switch (provider) {
            case PROVIDER_DROPBOX:
                endpoint = DROPBOX_AUTH_ENDPOINT;
                params.add(new BasicNameValuePair("force_reapprove", "true"));
                break;
            case PROVIDER_GDRIVE:
                endpoint = GOOGLE_AUTH_ENDPOINT;
                params.add(new BasicNameValuePair("scope",
                        "https://www.googleapis.com/auth/drive.appdata"));
                params.add(new BasicNameValuePair("include_granted_scopes", "false"));
                break;
            case PROVIDER_GMAIL:
                endpoint = GOOGLE_AUTH_ENDPOINT;
                params.add(new BasicNameValuePair("scope",
                        "https://www.googleapis.com/auth/gmail.compose"));
                params.add(new BasicNameValuePair("include_granted_scopes", "false"));
                break;
            case PROVIDER_HUBIC:
                endpoint = HUBIC_AUTH_ENDPOINT;
                params.add(new BasicNameValuePair("scope", "credentials.r"));
                break;
        }

        return endpoint + "?" + Request.encodeQuery(params);
    }

    public Request.Response token(String code, boolean refresh) {
        String endpoint = "";
        List<NameValuePair> params = new ArrayList<NameValuePair>();

        params.add(new BasicNameValuePair("client_id", client_id));
        params.add(new BasicNameValuePair("client_secret", client_secret));

        if (refresh) {
            params.add(new BasicNameValuePair("refresh_token", code));
            params.add(new BasicNameValuePair("grant_type", "refresh_token"));
        } else {
            params.add(new BasicNameValuePair("code", code));
            params.add(new BasicNameValuePair("grant_type", "authorization_code"));
            params.add(new BasicNameValuePair("redirect_uri", OAUTH_REDIRECT_URI));
        }

        switch (provider) {
            case PROVIDER_DROPBOX:
                endpoint = DROPBOX_TOKEN_ENDPOINT;
                break;
            case PROVIDER_GDRIVE:
            case PROVIDER_GMAIL:
                endpoint = GOOGLE_TOKEN_ENDPOINT;
                break;
            case PROVIDER_HUBIC:
                endpoint = HUBIC_TOKEN_ENDPOINT;
                break;
        }

        List<NameValuePair> headers = new ArrayList<NameValuePair>();
        headers.add(new BasicNameValuePair("Content-Type",
                "application/x-www-form-urlencoded"));

        Uri uri = Uri.parse(endpoint);

        return new Request(Request.POST, uri.getHost(), uri.getPath(), headers,
                null).send(Request.encodeQuery(params));
    }
}
