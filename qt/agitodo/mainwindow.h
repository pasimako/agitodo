#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QtWebKitWidgets>
#include <QWebInspector>

#include <javascriptinterface.h>

class FileSys;

namespace Ui {
class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT
protected:
     void closeEvent(QCloseEvent *event);
public:
    enum MessageType {MessageInfo, MessageCritical, MessageQuestion};
    QString dbPath;

    explicit MainWindow(QString runDir, QWidget *parent = 0);
    ~MainWindow();
    
    bool showMessage(QString msg, MessageType msgType);
    void exit();
private slots:
    void on_actionExit_triggered();
    void on_actionAbout_triggered();
    void on_actionSupport_triggered();
private:
    Ui::MainWindow *ui;
    QString appTitle;
    QString appVersion;
    QString homePath;
    QString settingsPath;

    QWebView *webView;
    JavaScriptInterface *js;
    QWebInspector *webInspector;
    FileSys *sys;

    void writePositionSettings();
    void readPositionSettings();
};

#endif // MAINWINDOW_H
