"""OPD service composition root.

Imports ``create_app`` from the OPD module and wires concrete adapters here.
For the scaffold no adapters are wired yet; ``deps`` will carry repos, the
event publisher, and identity/authz clients once they exist.
"""

from opd import create_app

app = create_app()
