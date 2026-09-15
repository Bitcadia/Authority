import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("hook", Path(__file__).parents[1] / "tools/devops-hook.py")
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)

class ArtifactExtraction(unittest.TestCase):
    def archive(self, path):
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as archive:
            archive.writestr(path, "{}")
        return data.getvalue()

    def test_extract(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / "artifact"
            hook.extract_zip(self.archive("signed-publication/publication-build.json"), output)
            self.assertEqual((output / "signed-publication/publication-build.json").read_text(), "{}")

    def test_reject_traversal(self):
        for path in ["../escape", "/escape", "folder\\escape"]:
            with self.subTest(path=path), tempfile.TemporaryDirectory() as root:
                with self.assertRaises(ValueError):
                    hook.extract_zip(self.archive(path), Path(root) / "artifact")

    def test_reject_symlink(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as archive:
            entry = zipfile.ZipInfo("link")
            entry.external_attr = 0o120777 << 16
            archive.writestr(entry, "/keys")
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(ValueError):
                hook.extract_zip(data.getvalue(), Path(root) / "artifact")

if __name__ == "__main__":
    unittest.main()
