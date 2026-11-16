import importlib.util
import pathlib
import unittest

PATH=pathlib.Path(__file__).resolve().parents[1]/".github"/"scripts"/"draft_hold_decision.py"
spec=importlib.util.spec_from_file_location("draft_hold_decision",PATH)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class DraftHoldDecisionCases(unittest.TestCase):
    def test_open_ready_draft_prefix_redrafts(self):
        self.assertTrue(mod.should_redraft(title="[DRAFT] fix: x",state="OPEN",is_draft=False))

    def test_open_ready_hold_prefix_redrafts(self):
        self.assertTrue(mod.should_redraft(title="[HOLD] fix: x",state="OPEN",is_draft=False))

    def test_current_title_without_marker_is_noop(self):
        self.assertFalse(mod.should_redraft(title="fix: x",state="OPEN",is_draft=False))

    def test_already_draft_is_noop(self):
        self.assertFalse(mod.should_redraft(title="[DRAFT] fix: x",state="OPEN",is_draft=True))

    def test_closed_is_noop(self):
        self.assertFalse(mod.should_redraft(title="[DRAFT] fix: x",state="CLOSED",is_draft=False))

    def test_marker_must_be_prefix(self):
        self.assertFalse(mod.should_redraft(title="fix: x [DRAFT]",state="OPEN",is_draft=False))

if __name__=="__main__":
    unittest.main()
