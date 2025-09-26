import os, platform, subprocess, shlex

def print_pdf(pdf_path: str, printer: str = "", copies: int = 1, duplex: bool = False, paper: str = "A4", sumatra_path: str = ""):
    system = platform.system().lower()
    if system.startswith("win"):
        return _print_windows(pdf_path, printer=printer, copies=copies, duplex=duplex, sumatra_path=sumatra_path)
    else:
        return _print_linux(pdf_path, printer=printer, copies=copies, duplex=duplex, paper=paper)

def _print_windows(pdf_path: str, printer: str, copies: int, duplex: bool, sumatra_path: str):
    if not sumatra_path or not os.path.exists(sumatra_path):
        # fallback simples: tenta imprimir pelo verbo 'print' (pode abrir UI e usa impressora padrão)
        # Recomendado: configurar SUMATRA_PATH para impressão silenciosa.
        try:
            os.startfile(pdf_path, "print")
            return {"method": "os.startfile(print)", "note": "Sem SUMATRA_PATH; impressão via default printer (pode abrir UI)."}
        except Exception as e:
            raise RuntimeError(f"Windows print falhou (sem Sumatra): {e}")

    # SumatraPDF CLI
    # -exit-on-print: fecha após imprimir
    # -print-to "<PrinterName>": impressora alvo
    # -print-settings: duplex, copies
    settings = []
    if duplex:
        settings.append("duplex")
    if copies and copies > 1:
        settings.append(f"copies={copies}")
    args = [
        sumatra_path,
        "-exit-on-print"
    ]
    if printer:
        args += ["-print-to", printer]
    if settings:
        args += ["-print-settings", ",".join(settings)]
    args.append(pdf_path)

    # Usa subprocess, sem shell, para evitar problemas de aspas
    try:
        proc = subprocess.run(args, capture_output=True, text=True, check=True)
        return {"method": "SumatraPDF", "cmd": args, "stdout": proc.stdout, "stderr": proc.stderr}
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"SumatraPDF erro: {e.stderr or e.stdout or e}")

def _print_linux(pdf_path: str, printer: str, copies: int, duplex: bool, paper: str):
    # Requer CUPS instalado e impressora configurada
    cmd = ["lp"]
    if printer:
        cmd += ["-d", printer]
    if copies and copies > 1:
        cmd += ["-n", str(copies)]
    if duplex:
        cmd += ["-o", "sides=two-sided-long-edge"]
    if paper:
        cmd += ["-o", f"media={paper}"]
    cmd.append(pdf_path)

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {"method": "lp", "cmd": cmd, "stdout": proc.stdout, "stderr": proc.stderr}
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"lp erro: {e.stderr or e.stdout or e}")
