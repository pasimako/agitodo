#include <QMessageBox>
#include <QFileDialog>
#include <QString>
#include <QStringList>
#include <QFileInfo>
#include <QDir>
#include <QDesktopWidget>

#include "mainwindow.h"
#include "ui_mainwindow.h"

#include "filesys.h"

MainWindow::MainWindow(QString runDir, QWidget *parent) : QMainWindow(parent), ui(new Ui::MainWindow)
{
    appTitle = "Agitodo";
    appVersion = "1.6.0";

    ui->setupUi(this);
    webView = new QWebView();
    js = new JavaScriptInterface(this);
    sys = new FileSys(this);

    homePath = sys->relativeToabsolute(".config/agitodo/", QDir::homePath());
    settingsPath = sys->relativeToabsolute("settings.ini", homePath);
    dbPath = sys->relativeToabsolute("agitodo.db.json", homePath);

    this->setCentralWidget(webView);
    this->setWindowTitle(appTitle);
    this->setMinimumWidth(320);
    this->setMinimumHeight(480);

    webView->settings()->setAttribute(QWebSettings::ScrollAnimatorEnabled, true);

#ifdef QT_DEBUG
    webView->page()->settings()->setAttribute(QWebSettings::DeveloperExtrasEnabled, true);
    webInspector = new QWebInspector();
    webInspector->setPage(webView->page());
    webInspector->setVisible(true);
#endif

    webView->setContextMenuPolicy(Qt::CustomContextMenu);   // Disable right-click menu

    webView->page()->mainFrame()->addToJavaScriptWindowObject("Qt", js);

    webView->setContent(sys->readFile("://res/index.html").toUtf8(), "text/html", QUrl::fromLocalFile(runDir + "/index.html"));

    webView->page()->mainFrame()->evaluateJavaScript(sys->readFile(runDir + "/lib/jquery-2.1.3.min.js"));

    webView->page()->mainFrame()->evaluateJavaScript(sys->readFile(runDir + "/lib/xdate.js"));

    webView->page()->mainFrame()->evaluateJavaScript(sys->readFile(runDir + "/lib/pbkdf2.js"));
    webView->page()->mainFrame()->evaluateJavaScript(sys->readFile(runDir + "/lib/sha1.js"));
    webView->page()->mainFrame()->evaluateJavaScript(sys->readFile(runDir + "/lib/sha256.js"));
    webView->page()->mainFrame()->evaluateJavaScript(sys->readFile(runDir + "/lib/aes.js"));

    webView->page()->mainFrame()->evaluateJavaScript(sys->readFile("://res/script.js"));

    readPositionSettings();
}

MainWindow::~MainWindow()
{
#ifdef QT_DEBUG
    //delete webInspector;
#endif
    //delete js;
    //delete webView;
    //webView->deleteLater();
    //delete sys;
    //delete ui;
}

void MainWindow::exit()
{
    qApp->quit();
}

// Close window using "X" button (or Alt-F4)
void MainWindow::closeEvent(QCloseEvent *event)
{
    writePositionSettings();
    emit js->jsExit(false);
    event->ignore();
}

// Close window using "Exit" menu
void MainWindow::on_actionExit_triggered()
{
    writePositionSettings();
    emit js->jsExit(false);
}

// Help->Support
void MainWindow::on_actionSupport_triggered()
{
    QDesktopServices::openUrl(QUrl("http://example.com", QUrl::TolerantMode));
}

// Help -> About
void MainWindow::on_actionAbout_triggered()
{
    QString os;
    QString cpu;

#ifdef Q_OS_LINUX
    os = "Linux";
#else
#ifdef Q_OS_WIN32
    os = "Windows";
#endif
#endif

#ifdef Q_PROCESSOR_X86_64
    cpu = "64-bit";
#else
#ifdef Q_PROCESSOR_X86_32
    cpu = "32-bit";
#endif
#endif

    QString msg = QString("<p><b>%1</b></p>").arg(appTitle) + QString("<p>Version %1 (%2 %3)</p>").arg(appVersion).arg(os).arg(cpu) + sys->readFile("://res/license.txt");

    QMessageBox msgBox(QMessageBox::Information, appTitle, msg, QMessageBox::Ok, this);

    QPixmap icon("://res/icon-128.png");
    msgBox.setIconPixmap(icon);

    msgBox.setDetailedText(sys->readFile("://res/thirdparties.txt"));

    msgBox.setWindowFlags(msgBox.windowFlags() & ~Qt::WindowCloseButtonHint);
    msgBox.setTextFormat(Qt::RichText);

    msgBox.exec();
}

void MainWindow::writePositionSettings()
{
    QSettings settings(settingsPath, QSettings::IniFormat);

    settings.beginGroup("mainwindow");

    settings.setValue("geometry", saveGeometry());
    settings.setValue("savestate", saveState());
    settings.setValue("maximized", isMaximized());

    if (!isMaximized()) {
        settings.setValue("pos", pos());
        settings.setValue("size", size());
    }

    settings.endGroup();
}

void MainWindow::readPositionSettings()
{
    QSettings settings(settingsPath, QSettings::IniFormat);

    settings.beginGroup("mainwindow");

    restoreGeometry(settings.value("geometry", saveGeometry()).toByteArray());
    restoreState(settings.value("savestate", saveState()).toByteArray());
    move(settings.value("pos", pos()).toPoint());

    QDesktopWidget *dw = QApplication::desktop();

    QRect screenSize = dw->availableGeometry(this);

    resize(settings.value("size", QSize(screenSize.width()*0.5, screenSize.width()*0.5/1.6)).toSize());

    if (settings.value("maximized", isMaximized()).toBool()) {
        showMaximized();
    }

    settings.endGroup();
}

bool MainWindow::showMessage(QString msg, MessageType msgType)
{
    bool ok = false;

    if(msgType == MessageInfo)
    {
        QMessageBox msgBox(QMessageBox::Information, appTitle, msg, QMessageBox::Ok, this);
        msgBox.exec();
        ok = true;
    }
    else if(msgType == MessageCritical)
    {
        QMessageBox msgBox(QMessageBox::Critical, appTitle, msg, QMessageBox::Ok, this);
        msgBox.exec();
        ok = true;
    }
    else if(msgType == MessageQuestion)
    {
        QMessageBox msgBox(QMessageBox::Question, appTitle, msg, QMessageBox::Ok | QMessageBox::Cancel, this);

        if(msgBox.exec() == QMessageBox::Ok)
        {
            ok = true;
        }
    }

    return ok;
}
