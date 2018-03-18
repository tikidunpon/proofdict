"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MIT © 2017 azu
var prh_1 = require("prh");
var proofdict_tester_util_1 = require("./proofdict-tester-util");
var TagFilter_1 = require("./TagFilter");
var ProofdictTester = /** @class */ (function() {
    function ProofdictTester(options) {
        this.proofdict = options.dictionary;
        var filteredProofdict = TagFilter_1.filterByTags(this.proofdict, options.whitelistTags, options.blacklistTags);
        this.prhEngine = new prh_1.Engine({
            version: 1,
            rules: filteredProofdict.map(function(dict) {
                return {
                    id: dict.id,
                    expected: dict.expected,
                    patterns: TagFilter_1.isNoun(dict)
                        ? dict.patterns.map(function(pattern) {
                              return proofdict_tester_util_1.wrapWordBoundaryToString(pattern);
                          })
                        : dict.patterns,
                    tags: dict.tags,
                    description: dict.description
                };
            })
        });
    }
    ProofdictTester.prototype.replace = function(text) {
        return this.match(text).then(function(result) {
            return result.output;
        });
    };
    ProofdictTester.prototype.match = function(text) {
        // pass empty string for working in browser
        // https://github.com/prh/prh/issues/29
        var changeSet = this.prhEngine.makeChangeSet("", text);
        var sortedDiffs = changeSet.diffs.sort(function(a, b) {
            return a.index - b.index;
        });
        var deltaTestStartPosition = 0;
        var currentString = text;
        var results = [];
        sortedDiffs.forEach(function(diff) {
            if (!diff.expected) {
                return;
            }
            // Extension: "noun"
            // Automatically add word boundary to the patterns
            if (TagFilter_1.isNoun(diff.rule.raw)) {
                var expectPatterns = proofdict_tester_util_1.wrapHyphenWordBoundary(diff.pattern);
                var isExpected = expectPatterns.some(function(expectPattern) {
                    return expectPattern.test(currentString);
                });
                if (isExpected) {
                    return;
                }
            }
            var applied = diff.apply(currentString, deltaTestStartPosition);
            if (applied == null) {
                return;
            }
            // matchStartIndex/matchEndIndex value is original position, not replaced position
            // textlint use original position
            var matchStartIndex = diff.index;
            var matchEndIndex = matchStartIndex + diff.matches[0].length;
            var actual = currentString.slice(matchStartIndex, matchEndIndex);
            var expected = diff.newText;
            var description = diff.rule && diff.rule.raw.description;
            var rule = diff.rule && diff.rule.raw;
            results.push({
                rule: rule,
                matchStartIndex: matchStartIndex,
                matchEndIndex: matchEndIndex,
                actual: actual,
                expected: expected,
                description: description
            });
            currentString = applied.replaced;
            deltaTestStartPosition = applied.newDelta;
        });
        return Promise.resolve({
            output: currentString,
            details: results,
            diffs: sortedDiffs
        });
    };
    return ProofdictTester;
})();
exports.ProofdictTester = ProofdictTester;
//# sourceMappingURL=proofdict-tester.js.map