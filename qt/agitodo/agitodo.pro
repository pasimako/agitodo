#-------------------------------------------------
#
# Project created by QtCreator 2017-05-28T20:06:42
#
#-------------------------------------------------

QT       += core gui webkitwidgets network

greaterThan(QT_MAJOR_VERSION, 4): QT += widgets

TARGET = agitodo
TEMPLATE = app


SOURCES += main.cpp\
        mainwindow.cpp \
    filesys.cpp \
    javascriptinterface.cpp \
    server.cpp

HEADERS  += mainwindow.h \
    filesys.h \
    javascriptinterface.h \
    server.h

FORMS += \
    mainwindow.ui

RESOURCES += \
    agitodo.qrc

CONFIG(release, debug|release): DEFINES += QT_NO_DEBUG_OUTPUT
