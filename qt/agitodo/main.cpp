#include "mainwindow.h"
#include <QApplication>
#include <QtWebKitWidgets>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    MainWindow w(QFileInfo(a.applicationFilePath()).canonicalPath());
    w.show();
    
    return a.exec();
}
