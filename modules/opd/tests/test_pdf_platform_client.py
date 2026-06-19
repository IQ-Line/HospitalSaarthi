from opd.lib.default_report_logo import DEFAULT_REPORT_LOGO_DATA_URL
from opd.lib.pdf_platform_client import inline_clinical_report_logo_in_html, is_valid_pdf_bytes


def test_inline_clinical_report_logo_replaces_relative_src() -> None:
    html = '<header><img src="/reportLogo.png" alt="" class="logo-image"></header>'
    result = inline_clinical_report_logo_in_html(html, DEFAULT_REPORT_LOGO_DATA_URL)
    assert "/reportLogo.png" not in result
    assert DEFAULT_REPORT_LOGO_DATA_URL in result


def test_inline_clinical_report_logo_replaces_bare_report_logo_path() -> None:
    html = '<img src="/reportLogo.svg" alt="" />'
    result = inline_clinical_report_logo_in_html(html, DEFAULT_REPORT_LOGO_DATA_URL)
    assert "/reportLogo.svg" not in result
    assert DEFAULT_REPORT_LOGO_DATA_URL in result


def test_inline_clinical_report_logo_keeps_existing_data_url() -> None:
    html = f'<img src="{DEFAULT_REPORT_LOGO_DATA_URL}" alt="" class="logo-image">'
    assert inline_clinical_report_logo_in_html(html, "data:image/png;base64,abc") == html


def test_is_valid_pdf_bytes() -> None:
    sample = b"%PDF-1.4\n" + (b" " * 120) + b"\n%%EOF\n"
    assert is_valid_pdf_bytes(sample)
    assert not is_valid_pdf_bytes(b"not-a-pdf")
    assert not is_valid_pdf_bytes(b"%PDF-")
    truncated = b"%PDF-1.4\n" + (b"x" * 200)
    assert not is_valid_pdf_bytes(truncated)
