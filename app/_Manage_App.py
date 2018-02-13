##==============================================================#
## SECTION: Imports                                             #
##==============================================================#

import auxly
import qprompt
import os.path as op

##==============================================================#
## SECTION: Global Definitions                                  #
##==============================================================#

ELECTRON = r"..\utils\electron_core"

##==============================================================#
## SECTION: Function Definitions                                #
##==============================================================#

def set_electron():
    global ELECTRON
    ELECTRON = qprompt.ask_str("Path to electron", blank=False)

def run_app():
    global ELECTRON
    path = op.normpath(op.join(ELECTRON, "electron.exe"))
    qprompt.alert(path)
    auxly.shell.call(f"start {path} .")

def build_app():
    auxly.filesys.makedirs("__output__")
    auxly.shell.call("electron-packager . doctrine2 --out __output__ --electron-version=1.3.0 --overwrite")

def clean_build():
    auxly.filesys.delete("__output__")

##==============================================================#
## SECTION: Main Body                                           #
##==============================================================#

if __name__ == '__main__':
    menu = qprompt.Menu()
    menu.add("b", "Build application", build_app)
    menu.add("c", "Clean build", clean_build)
    menu.add("r", "Run application", run_app)
    menu.add("s", "Set Electron location", set_electron)
    menu.main(loop=True)
