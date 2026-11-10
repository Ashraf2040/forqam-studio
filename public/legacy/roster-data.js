// ============================================================================
// roster-data.js — the real school roster (imported from the CSV exports).
//   SM_ROSTER.subjects — every subject label as it appears in teachers_*.csv
//                        (multi-subject teachers keep their joined labels).
//   SM_ROSTER.classes  — the 28 official class names of the school.
// Screens read these instead of hard-coded demo subjects/classes:
//   window.SM_ROSTER via ALL_SUBJECTS (portal) and pick-class hints.
// ============================================================================
(function () {
    'use strict';
    window.SM_ROSTER = {
        subjects: [
            "Arabic",
            "Islamic",
            "Arabic | Islamic",
            "Social Arabic",
            "English",
            "English | Life Skills",
            "English | Be Well",
            "English | Life Skills | Be Well",
            "ICT",
            "French",
            "Math",
            "Science",
            "AP Biology | Biology | Science",
            "Chemistry | SAAT Chemistry",
            "Physics | Science | SAAT Physics"
        ],
        classes: [
            "1A", "2A", "3A", "4A", "4B", "4C",
            "5A", "5B", "5C",
            "6A", "6B", "6C",
            "7A", "7B", "7C", "7G",
            "8A", "8B", "8C", "8G",
            "9A", "9G",
            "10A", "10B",
            "11A", "11B",
            "12A", "12B"
        ],
        school: "Al-Furqan Private School"
    };
})();
