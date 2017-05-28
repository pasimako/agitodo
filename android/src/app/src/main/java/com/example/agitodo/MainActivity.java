package com.example.agitodo;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.Context;
import android.os.Handler;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.JavascriptInterface;

import android.widget.Toast;
import android.widget.TextView;
import android.app.AlertDialog;
import android.content.DialogInterface;

import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.net.Uri;

import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLEncoder;
import java.net.URLDecoder;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.DataOutputStream;
import java.io.FileOutputStream;
import java.lang.Thread;
import java.lang.StringBuffer;

import org.json.JSONObject;

public class MainActivity extends Activity {
    String FILE_DB = "agitodo.db.json";
    boolean DEBUG = false;

    Logger log = new Logger();

    WebView webview;
    WebAppInterface webappinterface;
    Handler handler = new Handler();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.main);

        webview = (WebView) findViewById(R.id.webview);

        webappinterface = new WebAppInterface(this, webview);

        webview.addJavascriptInterface(webappinterface, "Android");

        webview.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings webSettings = webview.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDefaultTextEncodingName("UTF-8");
        webSettings.setGeolocationEnabled(false);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(false);
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        webview.loadUrl("file:///android_asset/app/index.html");

        Logger.debug = DEBUG;
    }

    @Override
    public void onBackPressed() {
        webappinterface.callMethod("compat.backend.goBack");
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.main_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.menu_support:
                startActivity(new Intent(Intent.ACTION_VIEW,
                        Uri.parse("http://agitodo.com")));
                return true;
            case R.id.menu_about:
                showAbout();
                return true;
            case R.id.menu_exit:
                exit();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    public void exit() {
        finish();
    }

    protected void showAbout() {
        View messageView = getLayoutInflater().inflate(R.layout.about, null, false);

        TextView textView = (TextView) messageView.findViewById(R.id.about_extra);

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setIcon(R.drawable.ic_launcher);
        builder.setTitle(R.string.app_name);
        builder.setView(messageView);

        builder.setPositiveButton(R.string.dialog_ok,
                new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        dialog.dismiss();
                    }
                });

        builder.create();
        builder.show();
    }

    public class Server implements Runnable {
        private int MAX_WAIT = 10 * 60000; // milliseconds -> minutes
        private String html_ok = "<!DOCTYPE HTML><html><head><meta charset=\"UTF-8\"><title>Agitodo</title><script>window.close();</script></head><body><h2>Authorization code acquired. Please close this window...</h2></body></html>";
        private String html_error_f = "<!DOCTYPE HTML><html><head><meta charset=\"UTF-8\"><title>Agitodo</title><script>window.close();</script></head><body>%s<h2>Error acquiring authorization code. Please close this window...</h2></body></html>";
        private ServerSocket serverSocket;

        public String code;
        public String error;

        public void run() {
            code = "";
            error = "";

            Socket socket = null;
            String line = "";
            boolean validRequest = false;

            log.info("Server start");

            try {
                serverSocket = new ServerSocket(8081);

                log.info("Listening on " + serverSocket.getInetAddress() + ":"
                        + serverSocket.getLocalPort());

                handler.postDelayed(new Runnable() {
                    public void run() {
                        log.info("Server autoclose");
                        close();
                    }
                }, MAX_WAIT);

                socket = serverSocket.accept();

                BufferedReader streamIn = new BufferedReader(new InputStreamReader(
                        socket.getInputStream()));

                while (((line = streamIn.readLine()) != null) && (!line.equals(""))) {
                    log.info(line);

                    if (line.startsWith("GET /oauth-code?")) {
                        code = extractParam("code", line);

                        log.info("code='" + code + "'");

                        if (code.isEmpty()) {
                            error = extractParam("error", line);

                            log.info("error=" + code);
                        }

                        validRequest = true;
                    }
                }

                DataOutputStream streamOut = new DataOutputStream(
                        socket.getOutputStream());

                if (validRequest) {
                    String html = "";

                    if (!code.isEmpty()) {
                        html = html_ok;
                    } else {
                        html = String.format(html_error_f,
                                String.format("<h3>%s</h3>", error));
                    }

                    streamOut.writeBytes("HTTP/1.1 200 OK\r\n");
                    streamOut.writeBytes("Connection: close\r\n");
                    streamOut.writeBytes("Content-Type: text/html\r\n");
                    streamOut.writeBytes("Content-Length: "
                            + Integer.toString(html.length()) + "\r\n");
                    streamOut.writeBytes("\r\n");
                    streamOut.writeBytes(html);
                    streamOut.writeBytes("\r\n\r\n");
                } else {
                    streamOut.writeBytes("HTTP/1.1 404 Not Found\r\n");
                    streamOut.writeBytes("Connection: close\r\n");
                    streamOut.writeBytes("\r\n");
                }

                streamIn.close();
                streamOut.close();
            } catch (Exception e) {
                error = e.toString();
                log.error(e.toString());
            } finally {
                if (socket != null) {
                    try {
                        socket.close();
                    } catch (Exception e) {
                        log.error(e.toString());
                    }
                }

                close();
            }

            log.info("Server exit");
        }

        public void close() {
            log.info("Server close");

            handler.removeCallbacksAndMessages(null);

            try {
                serverSocket.close();
            } catch (Exception e) {
                log.error(e.toString());
            }
        }

        private String extractParam(String param, String line) {
            String name = "";

            try {
                name = URLEncoder.encode(param, "UTF8");
            } catch (Exception e) {
                log.error(e.toString());
            }

            if (name.isEmpty()) {
                return "";
            }

            String value = "";
            int start = line.indexOf(name + "=");

            if (start > -1) {
                start += name.length() + 1;

                int end = line.indexOf("&", start);

                if (end == -1) {
                    end = line.indexOf(" ", start);
                }

                if (end > -1) {
                    try {
                        value = URLDecoder.decode(line.substring(start, end), "UTF8");
                    } catch (Exception e) {
                        log.error(e.toString());
                    }
                }
            }

            return value;
        }
    }

    public class WebAppInterface {
        private Context context;
        private WebView webview;
        private Server server = new Server();
        private Thread serverThread = null;

        WebAppInterface(Context c, WebView w) {
            context = c;
            webview = w;
        }

        private void callMethod(String method) {
            final String exec = String.format("javascript:%s();", method);

            webview.post(new Runnable() {
                public void run() {
                    webview.loadUrl(exec);
                }
            });
        }

        public void callback(int status, String body) {
            JSONObject json = new JSONObject();

            try {
                json.put("status", status);
                json.put("body", body);
            } catch (Exception e) {
                log.error(e.toString());
                return;
            }

            final String exec = String.format(
                    "javascript:compat.backend.callback(%s);", json.toString());

            webview.post(new Runnable() {
                public void run() {
                    webview.loadUrl(exec);
                }
            });
        }

        @JavascriptInterface
        public void log(String msg) {
            log.info(msg);
        }

        @JavascriptInterface
        public void toast(String msg) {
            Toast.makeText(context, msg, Toast.LENGTH_LONG).show();
        }

        @JavascriptInterface
        public void exitApp() {
            exit();
        }

        @JavascriptInterface
        public void openURL(String url) {
            try {
                webview.getContext().startActivity(
                        new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception e) {
                log.error(e.toString());
            }
        }

        @JavascriptInterface
        public String dbRead() {
            String data = "";

            try {
                BufferedReader inputReader = new BufferedReader(new InputStreamReader(
                        openFileInput(FILE_DB)));

                String inputString;

                StringBuffer stringBuffer = new StringBuffer();

                while ((inputString = inputReader.readLine()) != null) {
                    stringBuffer.append(inputString + "\n");
                }

                data = stringBuffer.toString();

            } catch (Exception e) {
                log.error(e.toString());
            }

            return data;
        }

        @JavascriptInterface
        public void dbWrite(String data) {
            FileOutputStream outputStream;

            try {
                outputStream = openFileOutput(FILE_DB, Context.MODE_PRIVATE);
                outputStream.write(data.getBytes());
                outputStream.close();
            } catch (Exception e) {
                log.error(e.toString());
            }
        }

        @JavascriptInterface
        public boolean oauthUrl(int service) {
            if (serverThread != null) {
                server.close();
                try {
                    serverThread.join();
                } catch (Exception e) {
                    log.error(e.toString());
                }
            }

            serverThread = new Thread(server);
            serverThread.start();

            String url = new OAuth(service).authURL();

            try {
                webview.getContext().startActivity(
                        new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception e) {
                log.error(e.toString());
                return false;
            }

            return true;
        }

        @JavascriptInterface
        public String oauthCode() {
            log.info("oauthCode");
            if (!server.error.isEmpty()) {
                return null;
            }

            return server.code;
        }

        @JavascriptInterface
        public void dropboxToken(final String code) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new OAuth(OAuth.PROVIDER_DROPBOX).token(
                            code, false);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void dropboxFileGet(final String access_token, final String path) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Dropbox(access_token).file_get(path);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void dropboxFilePut(final String access_token, final String path,
                                   final String body) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Dropbox(access_token).file_put(path,
                            body);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void gdriveToken(final String code, final boolean refresh) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new OAuth(OAuth.PROVIDER_GDRIVE).token(
                            code, refresh);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void gdriveMetadata(final String access_token, final String fileId) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Gdrive(access_token).metadata(fileId);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void gdriveList(final String access_token, final String filename) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Gdrive(access_token).list(filename);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void gdriveNewFile(final String access_token, final String filename,
                                  final String content) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Gdrive(access_token).newFile(
                            filename, content);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void gdriveUpdateFile(final String access_token,
                                     final String fileId, final String content) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Gdrive(access_token).updateFile(
                            fileId, content);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void gdriveGetFile(final String access_token,
                                  final String downloadUrl) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Gdrive(access_token)
                            .getFile(downloadUrl);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void hubicToken(final String code, final boolean refresh) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new OAuth(OAuth.PROVIDER_HUBIC).token(
                            code, refresh);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void hubicCredentials(final String access_token) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Hubic(access_token).credentials();
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void hubicGetObject(final String openstack_token,
                                   final String endpoint, final String resource_path) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Hubic(openstack_token).getObject(
                            endpoint, resource_path);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void hubicPutObject(final String openstack_token,
                                   final String endpoint, final String resource_path, final String content) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Hubic(openstack_token).putObject(
                            endpoint, resource_path, content);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void gmailToken(final String code, final boolean refresh) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new OAuth(OAuth.PROVIDER_GMAIL).token(
                            code, refresh);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }

        @JavascriptInterface
        public void gmailSend(final String access_token, final String to,
                              final String subject, final String content) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    Request.Response response = new Gmail(access_token).send(to, subject,
                            content);
                    callback(response.status, response.body);
                }
            };

            thread.start();
        }
    }
}
