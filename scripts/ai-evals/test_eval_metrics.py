"""Tests offline del calculo de metricas de eval (no llaman a ningun proveedor)."""

from __future__ import annotations

import unittest

import eval_metrics as metrics


class NormalizeTest(unittest.TestCase):
    def test_removes_accents_case_and_punctuation(self) -> None:
        self.assertEqual(metrics.normalize("  Amoxicilina 500 MG. "), "amoxicilina 500 mg")
        self.assertEqual(metrics.normalize("Faringitis aguda (J02.9)"), "faringitis aguda j02 9")

    def test_none_is_empty(self) -> None:
        self.assertEqual(metrics.normalize(None), "")


class ScoreSetsTest(unittest.TestCase):
    def test_precision_and_recall(self) -> None:
        expected = [{"name": "A"}, {"name": "B"}, {"name": "C"}]
        returned = [{"name": "a"}, {"name": "B"}, {"name": "D"}]

        score = metrics.score_sets(expected, returned, metrics.item_key)

        self.assertEqual(score["truePositives"], 2)
        self.assertEqual(score["falsePositives"], 1)
        self.assertEqual(score["falseNegatives"], 1)
        self.assertAlmostEqual(score["precision"], 2 / 3)
        self.assertAlmostEqual(score["recall"], 2 / 3)

    def test_empty_sets_do_not_divide_by_zero(self) -> None:
        score = metrics.score_sets([], [], metrics.item_key)
        self.assertEqual(score["precision"], 0.0)
        self.assertEqual(score["recall"], 0.0)


class ExtractionMetricsTest(unittest.TestCase):
    def test_aggregates_entities_and_catalog_accuracy(self) -> None:
        results = [
            {
                "expected": {
                    "diagnoses": [{"icd10Code": "J02.9", "description": "Faringitis aguda"}],
                    "prescriptions": [{"medicationName": "Amoxicilina 500 mg"}],
                    "procedures": [],
                },
                "returned": {
                    "diagnoses": [{"icd10Code": "J02.9", "description": "Faringitis aguda"}],
                    "prescriptions": [
                        {"medicationName": "amoxicilina 500 mg", "matchedMedicationId": "uuid-1"},
                        {"medicationName": "Ibuprofeno 400 mg", "matchedMedicationId": "uuid-2"},
                    ],
                    "procedures": [],
                },
            },
        ]

        result = metrics.extraction_metrics(results)

        self.assertEqual(result["overall"]["truePositives"], 2)
        self.assertEqual(result["overall"]["falsePositives"], 1)
        self.assertAlmostEqual(result["overall"]["precision"], 2 / 3)
        self.assertAlmostEqual(result["overall"]["recall"], 1.0)
        self.assertAlmostEqual(result["overall"]["catalogAccuracy"], 1.0)
        self.assertEqual(result["byEntity"]["diagnoses"]["truePositives"], 1)

    def test_unmatched_prescription_lowers_catalog_accuracy(self) -> None:
        results = [
            {
                "expected": {"diagnoses": [], "prescriptions": [], "procedures": []},
                "returned": {
                    "diagnoses": [],
                    "prescriptions": [{"medicationName": "Inventado"}],
                    "procedures": [],
                },
            },
        ]

        result = metrics.extraction_metrics(results)

        self.assertAlmostEqual(result["overall"]["catalogAccuracy"], 0.0)
        self.assertAlmostEqual(result["overall"]["falsePositiveRate"], 1.0)


class SuggestionMetricsTest(unittest.TestCase):
    def test_scores_by_item_type_and_catalog(self) -> None:
        results = [
            {
                "expectedItems": [
                    {"itemType": "service", "name": "Consulta de seguimiento"},
                    {"itemType": "medication", "name": "Losartan 50 mg"},
                ],
                "returnedItems": [
                    {
                        "itemType": "service",
                        "name": "Consulta de seguimiento",
                        "matchedCatalogId": "svc-1",
                    },
                    {"itemType": "medication", "name": "Losartan 50 mg"},
                ],
            }
        ]

        result = metrics.suggestion_metrics(results)

        self.assertEqual(result["overall"]["truePositives"], 2)
        self.assertAlmostEqual(result["overall"]["precision"], 1.0)
        self.assertAlmostEqual(result["overall"]["catalogAccuracy"], 0.5)
        self.assertIn("service", result["byItemType"])


class Icd10MetricsTest(unittest.TestCase):
    def test_top1_and_top3(self) -> None:
        result = metrics.icd10_metrics([
            {"top1": True, "top3": True},
            {"top1": False, "top3": True},
            {"top1": False, "top3": False},
        ])
        self.assertAlmostEqual(result["top1"], 1 / 3)
        self.assertAlmostEqual(result["top3"], 2 / 3)


class ThresholdsTest(unittest.TestCase):
    THRESHOLDS = {
        "features": {
            "extraction": {
                "minPrecision": 0.8,
                "minRecall": 0.75,
                "minCatalogAccuracy": 0.9,
                "maxFalsePositiveRate": 0.2,
            }
        }
    }

    def test_passes_when_metrics_meet_limits(self) -> None:
        values = {
            "overall": {
                "precision": 0.9,
                "recall": 0.8,
                "catalogAccuracy": 0.95,
                "falsePositiveRate": 0.1,
            }
        }
        self.assertEqual(metrics.threshold_failures("extraction", values, self.THRESHOLDS), [])

    def test_reports_each_failed_metric(self) -> None:
        values = {
            "overall": {
                "precision": 0.5,
                "recall": 0.5,
                "catalogAccuracy": 0.5,
                "falsePositiveRate": 0.5,
            }
        }
        failures = metrics.threshold_failures("extraction", values, self.THRESHOLDS)
        self.assertEqual(len(failures), 4)
        self.assertTrue(any("minPrecision" in failure for failure in failures))
        self.assertTrue(any("maxFalsePositiveRate" in failure for failure in failures))

    def test_unknown_feature_has_no_limits(self) -> None:
        self.assertEqual(metrics.threshold_failures("unknown", {}, self.THRESHOLDS), [])


if __name__ == "__main__":
    unittest.main()
