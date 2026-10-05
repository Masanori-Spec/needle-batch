# Research and positioning

Reviewed 2026-10-05. This is a portfolio-scale software prototype, not evidence of customer demand, patents, worldwide novelty or product-market fit.

## A real handoff problem

Wilcom explains that design palette indexes are separate from thread identities/physical needle assignment and that direct needle numbers require careful production discipline. NeedleBatch asks the operator for explicit identities rather than guessing that equal RGB means interchangeable spools. [Wilcom: Thread charts & color index](https://help.wilcom.com/portal/en/kb/wilcom-international/embroidery-web-api/faqs/articles/thread-charts-color-index)

## Existing capabilities that must be acknowledged

- Embird already offers manual and automatic needle assignment in its file-conversion workflow. NeedleBatch is not the first automatic needle mapper. [Embird FAQ, File Formats](https://www.embird.net/faq.htm)
- Sierra EO23 documents needle-associated thread palettes, saved palettes and an Optimize Needles feature that arranges needle sequence to optimize color changes. [Sierra EO23 manual](https://www.sierra-software.com/Downloads/Manuals/EO23/emb-thread-color-palette.html)
- Stitch Toolbox documents U01 conversion and needle-addressed output. It is a possible additional viewer, but no user/source designs were sent to it for this project. Its guide is not the implementation authority for byte semantics. [Stitch Toolbox guide](https://stitchtoolbox.com/guides/barudan-u01-and-tajima-tbf)

The narrow difference explored here is a **fixed-order multi-design global minimum starting from current loads and locks**, followed by conservative original-file patching and an operator checklist with command-level provenance. The reviewed pages do not establish that complete workflow. That is not evidence that other products lack it; a broader competitive/customer study would be necessary before commercialization.

## Technical source and actual consumer

[pystitch 1.0.1 on PyPI](https://pypi.org/project/pystitch/1.0.1/) is an MIT-licensed Python embroidery IO library, used only for tests. Its actual downloaded wheel reads U01 with a 256-byte header, three-byte records and `control & 0x1f` command decoding. It treats STOP separately from explicit needle selection and honors movement embedded in both. [Upstream U01Reader](https://raw.githubusercontent.com/inkstitch/pystitch/main/src/pystitch/U01Reader.py) is useful reading, but the pinned installed wheel, recorded hash and executable consumer assertions define the reproducible gate. The library documentation explicitly discusses ambiguity in repeated source needle/thread meaning, which motivates one stable operator-confirmed mapping per design.

All source fixtures were newly authored as simple geometric control-record examples. The initial consumer spike was completed before application implementation. Real exported ZIP members are then independently checked by the same pinned reader and a separate raw-byte oracle. No generic writer normalizes the exported design.

## Practical next validation

Without contacting customers or operating a machine, this prototype can establish bounded optimization and file interpretation. Further evidence would require an explicitly authorized operator session, machine-specific import validation, and careful review of thread identity entry and checklist usability. Neither successful consumer decoding nor byte identity proves safe sewing.
