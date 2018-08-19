##==============================================================#
## SECTION: Imports                                             #
##==============================================================#

import auxly
import qprompt
from ubuild import menu, main

##==============================================================#
## SECTION: Global Definitions                                  #
##==============================================================#

ELECTRON = r"..\utils\electron_core_2"
OUTDIR = "__output__"

##==============================================================#
## SECTION: Function Definitions                                #
##==============================================================#

@menu
def build():
    auxly.filesys.makedirs(OUTDIR)
    auxly.shell.call(f"electron-packager . doctrine2 --out {OUTDIR} --electron-version=1.3.0 --overwrite")

@menu
def run_build():
    try:
        auxly.open(fr"{OUTDIR}\doctrine2-win32-x64\doctrine2.exe")
    except:
        qprompt.warn("Could not find executable!")

@menu
def run_dev():
    auxly.shell.call(fr"start {ELECTRON}\electron.exe .")

@menu
def clean():
    auxly.filesys.delete(OUTDIR)

##==============================================================#
## SECTION: Main Body                                           #
##==============================================================#

if __name__ == '__main__':
    main(default="b")
