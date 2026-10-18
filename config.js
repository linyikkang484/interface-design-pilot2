/* Pilot 2 / PL1 versus PL3 / Clean Direct — integrated-ab-idfix-20261019-04
 * Replace together with index.html and js/study.js from this package.
 * collectionEnabled is the single admission switch. true opens the consent page.
 * It is NOT an ethics approval, a source-rights check, or a live saving test.
 * completionRedirectEnabled uses the last URL explicitly supplied by the researcher;
 * its ownership/current Prolific-study association has not been verified here.
 * Fill real researcher/organization/data-retention/ethics information below before recruitment.
 * Empty fields are not fabricated and are no longer technical admission gates.
 * Keep studyId/build/dataSchema/dataNamespace unchanged to preserve protocol and sessions.
 * To pause new entry, change collectionEnabled to false. Do not clear participant records.
 */
window.STUDY_CONFIG = {
  "studyId": "ameline-pilot2-pl1-pl3-20261017-p01",
  "dataSchema": "pilot2-clean-direct-v1",
  "dataNamespace": "pilot2-clean-20261018-01",
  "backendPackage": "pilot2-clean-direct-20261018-01",
  "build": "pilot2-pl13-referencecrop-1.0.0",
  "collectionEnabled": true,
  "apiUrl": "https://script.google.com/macros/s/AKfycbyxwiiNw-pc7SAX55hXMa2vP_EyOq6BY2xWLH7WqleLiIgZS6wnQOTajJj2fEfViupOmw/exec",
  "completionUrl": "https://app.prolific.com/submissions/complete?cc=C1PMI3X2",
  "completionCode": "C1PMI3X2",
  "researcherName": "",
  "institution": "",
  "contact": "Please contact the researcher through the messaging system for this study on Prolific.",
  "retentionNotice": "",
  "ethicsNotice": "",
  "backgroundSyncSeconds": 120,
  "requiredServiceRevision": "integrated-ab-20261019-03",
  "entryRevision": "integrated-ab-idfix-20261019-04",
  "completionRedirectEnabled": true,
  "pidPolicy": "prolific-24char-v1"
};
