import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import TypeScript from 'tree-sitter-typescript';

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE NOISE LIST
// These method names represent framework plumbing in either Selenium (Java) or
// Playwright (TS). They are filtered out before intent mapping so they don't
// artificially inflate or deflate the accuracy score.
// ─────────────────────────────────────────────────────────────────────────────
const infrastructureNoise = new Set([

  // ── Selenium: Framework mechanics ────────────────────────────────────────
  'INITELEMENTS',                // PageFactory.initElements()
  'FINDELEMENT',                 // driver.findElement()
  'FINDELEMENTS',                // driver.findElements()
  'XPATH',                       // By.xpath() selector builder
  'PERFORM',                     // Actions.perform() — executes queued actions
  'WAIT',                        // WebDriverWait instance
  'UNTIL',                       // ExpectedConditions.until()
  'EXPECTEDCONDITIONS',          // ExpectedConditions class reference
  'WAITFORELEMENTTOBECLICKABLE', // Selenium-only scaffolding
  'GETFIRSTSELECTEDOPTION',      // Select class plumbing
  'SWITCHTO',                    // driver.switchTo() — handled via SWITCH_FRAME intent

  // ── Selenium: Driver setup and teardown ──────────────────────────────────
  'CHROMEDRIVER',
  'FIREFOXDRIVER',
  'EDGEDRIVER',
  'SAFARIDRIVER',
  'REMOTEWEBDRIVER',
  'BUILDCHROMEOPTIONS',
  'SETEXPERIMENTALOPTION',
  'ADDARGUMENTS',
  'MANAGE',
  'TIMEOUTS',
  'IMPLICITLYWAIT',
  'PAGELOADTIMEOUT',
  'SCRIPTTIMEOUT',
  'OFSECONDS',
  'OFMILLIS',
  'QUIT',
  'CLOSE',
  'CLOSEDRIVER',

  // ── Selenium: Lifecycle annotations / hooks ───────────────────────────────
  'INITIALIZATION',
  'STARTTESTCASE',
  'ENDTESTCASE',
  'SUPER',
  'SETUP',

  // ── Java / Generic language noise ────────────────────────────────────────
  'GETLOGGER',
  'GETINSTANCE',
  'LOGGER',
  'PRINTSTACKTRACE',
  'STREAM',
  'COLLECT',
  'MAP',
  'TOLIST',
  'ITERATOR',
  'HASNEXT',
  'NEXT',
  'REMOVE',
  'SIZE',
  'FLUSH',
  'GETCLASSLOADER',
  'GETRESOURCEASSTREAM',
  'GETMETHOD',
  'GETMETHODNAME',
  'GETTESTCLASS',
  'GETPARAMETERS',
  'HASHCODE',
  'RESOLVE',
  'COPY',
  'CREATEDIRECTORIES',

  // ── Project-specific Selenium/OrangeHRM wrappers ─────────────────────────
  'CLEAR_ACTION',       // Playwright .fill() clears automatically — not a real intent
  'WAIT_ACTION',        // Playwright has auto-waiting — not a real intent
  'ACTION_EXECUTE',     // Wraps Actions.perform() — not a real intent
  'MONTHNAME',          // Date picker artifact in Java
  'READEXPLICITWAITSECONDS',
  'OPENCONFIG',
  'LOAD',
  'GETDESCRIPTION',
  'GETRESULTSTATUSNAME',
  'GETPASSEDTESTS',
  'EXCELREADERUTILL',
  'EXCELREADERUTIL',
  'GETTESTDATA',

  // ── Loop/control flow artifacts ───────────────────────────────────────────
  'USED',
  'AND',
  'DATA',
  'FOR',
  'OF',
  'SUCCESSFULLOGINTEST',
  'INITIALIZE',
  'CWD',

  // ── Playwright: Framework lifecycle / test runner infrastructure ──────────
  // These appear in generated Playwright code but represent scaffolding,
  // not business logic. Filter them so they don't count against accuracy.
  'NEWPAGE',            // context.newPage()
  'NEWCONTEXT',         // browser.newContext()
  'NEWBROWSER',         // playwright.chromium.launch() equivalent
  'BEFOREALL',          // beforeAll() hook
  'AFTERALL',           // afterAll() hook
  'BEFOREEACH',         // beforeEach() hook
  'AFTEREACH',          // afterEach() hook
  'TEARDOWN',           // Custom teardown wrapper
  'EXTEND',             // test.extend() for base fixtures
  'MERGEEXPECTS',       // Custom expect extension
  'STEP',               // test.step() — structural wrapper, not logic
  'DESCRIBE',           // describe() block
  'CANRETRY',           // Retry config
  'SETTIMEOUT',         // test.setTimeout()
  'SLOW',               // test.slow()
  'SKIP',               // test.skip()
  'FIXME',              // test.fixme()
  'ONLY',               // test.only()
  'USE',                // test.use()
  'ANNOTATE',           // test.info().annotations
  'ATTACH',             // test.info().attach() — reporting infra
  'WAITFOR',            // Playwright waitFor() — auto-wait scaffolding
  'LOCATOR',            // locator() — element reference builder, not an action
  'EXPECT',             // expect() wrapper — the real intent comes from the matcher

  // ── Playwright: Logging / reporting ──────────────────────────────────────
  'CONSOLELOG',
  'CONSOLEERROR',
  'CONSOLEWARN',
]);

// ─────────────────────────────────────────────────────────────────────────────
// INTENT MAP
// Maps raw method names (any casing) to canonical intent symbols.
// Keys are looked up after lowercasing the raw method name.
// Canonical symbols are UPPER_SNAKE_CASE.
// ─────────────────────────────────────────────────────────────────────────────
const intentMap = {

  // ── Navigation ────────────────────────────────────────────────────────────
  'get':                       'NAVIGATE',
  'goto':                      'NAVIGATE',
  'navigate':                  'NAVIGATE',
  'open':                      'NAVIGATE',
  'goback':                    'NAVIGATE_HISTORY',
  'goforward':                 'NAVIGATE_HISTORY',
  'back':                      'NAVIGATE_HISTORY',
  'forward':                   'NAVIGATE_HISTORY',
  'reload':                    'NAVIGATE_HISTORY',
  'refresh':                   'NAVIGATE_HISTORY',
  'navigatetocontactdetails':  'NAVIGATE_SECTION',

  // ── Click / pointer ───────────────────────────────────────────────────────
  'click':                     'CLICK',
  'clickasync':                'CLICK',
  'dblclick':                  'DOUBLE_CLICK',
  'doubleclick':               'DOUBLE_CLICK',
  'contextmenu':               'RIGHT_CLICK',
  'rightclick':                'RIGHT_CLICK',
  'tap':                       'TAP',

  // ── Input / form fill ─────────────────────────────────────────────────────
  'sendkeys':                  'INPUT',
  'fill':                      'INPUT',
  'type':                      'INPUT',
  'clearandtype':              'INPUT',
  'presssequentially':         'INPUT',
  'clear':                     'CLEAR',

  // ── Keyboard ──────────────────────────────────────────────────────────────
  'press':                     'KEYBOARD_ACTION',
  'keydown':                   'KEYBOARD_ACTION',
  'keyup':                     'KEYBOARD_ACTION',
  'keyboard.press':            'KEYBOARD_ACTION',
  'keyboard.down':             'KEYBOARD_ACTION',
  'keyboard.up':               'KEYBOARD_ACTION',
  'keyboard.type':             'KEYBOARD_ACTION',
  'keyboard.inserttext':       'KEYBOARD_ACTION',

  // ── Hover / mouse move ────────────────────────────────────────────────────
  'hover':                     'HOVER',
  'movetoelement':             'HOVER',
  'mousemove':                 'HOVER',
  'mousedown':                 'MOUSE_DOWN',
  'mouseup':                   'MOUSE_UP',

  // ── Drag and drop ─────────────────────────────────────────────────────────
  'draganddrop':               'DRAG_DROP',
  'dragto':                    'DRAG_DROP',
  'drag':                      'DRAG_DROP',
  'clickandhold':              'DRAG_DROP',
  'release':                   'DRAG_DROP',

  // ── Scroll ────────────────────────────────────────────────────────────────
  'scrollintoview':            'SCROLL',
  'scrollintoviewifneeded':    'SCROLL',
  'scrollto':                  'SCROLL',
  'scroll':                    'SCROLL',
  'scrolltoelement':           'SCROLL',

  // ── Select / dropdown ────────────────────────────────────────────────────
  'selectbyvisibletext':       'SELECT_OPTION',
  'selectbyvalue':             'SELECT_OPTION',
  'selectbyindex':             'SELECT_OPTION',
  'selectoption':              'SELECT_OPTION',
  'selectbyvisibletest':       'SELECT_OPTION',   // typo variant kept for compat

  // ── File handling ─────────────────────────────────────────────────────────
  'setinputfiles':             'FILE_UPLOAD',
  'waitfordownload':           'FILE_DOWNLOAD',
  'savedownload':              'FILE_DOWNLOAD',

  // ── Frame / iframe ────────────────────────────────────────────────────────
  'framelocator':              'SWITCH_FRAME',
  'frame':                     'SWITCH_FRAME',
  'defaultcontent':            'FRAME_EXIT',
  'parentframe':               'FRAME_EXIT',

  // ── Window / tab management ───────────────────────────────────────────────
  'switchtowindow':            'SWITCH_WINDOW',
  'bringtofront':              'SWITCH_WINDOW',
  'getwindowhandles':          'GET_WINDOW_HANDLES',
  'getwindowhandle':           'GET_WINDOW_HANDLES',
  'pages':                     'GET_WINDOW_HANDLES',
  'setviewportsize':           'VIEWPORT_SET',
  'maximize':                  'VIEWPORT_SET',
  'newpage':                   'NEW_TAB',
  'waitforpopup':              'NEW_TAB',

  // ── Alerts / dialogs ──────────────────────────────────────────────────────
  'alertispresent':            'BROWSER_DIALOG',
  'accept':                    'BROWSER_DIALOG',
  'dismiss':                   'BROWSER_DIALOG',
  'waitfordialog':             'BROWSER_DIALOG',
  'ondialog':                  'BROWSER_DIALOG',

  // ── Network interception ──────────────────────────────────────────────────
  'route':                     'NETWORK_INTERCEPT',
  'unroute':                   'NETWORK_INTERCEPT',
  'waitforresponse':           'NETWORK_WAIT',
  'waitforrequest':            'NETWORK_WAIT',
  'waitforevent':              'NETWORK_WAIT',

  // ── JavaScript execution ──────────────────────────────────────────────────
  'executescript':             'JS_EXECUTE',
  'executeasyncscript':        'JS_EXECUTE',
  'evaluate':                  'JS_EXECUTE',
  'evaluatehandle':            'JS_EXECUTE',

  // ── Cookie management ─────────────────────────────────────────────────────
  'getcookies':                'COOKIE_READ',
  'cookies':                   'COOKIE_READ',
  'addcookie':                 'COOKIE_WRITE',
  'addcookies':                'COOKIE_WRITE',
  'deleteallcookies':          'COOKIE_CLEAR',
  'clearcookies':              'COOKIE_CLEAR',
  'deletecookienamed':         'COOKIE_CLEAR',

  // ── Storage ───────────────────────────────────────────────────────────────
  'localstorage':              'STORAGE_OP',
  'sessionstorage':            'STORAGE_OP',

  // ── Assertions — equality ─────────────────────────────────────────────────
  'assertequals':              'ASSERT_EQ',
  'tobe':                      'ASSERT_EQ',
  'assertnotequals':           'ASSERT_NEQ',
  'nottobe':                   'ASSERT_NEQ',

  // ── Assertions — truth ───────────────────────────────────────────────────
  'asserttrue':                'ASSERT_TRUE',
  'tobetruthy':                'ASSERT_TRUE',
  'assertfalse':               'ASSERT_FALSE',
  'tobefalshy':                'ASSERT_FALSE',
  'fail':                      'ASSERT_FAIL',

  // ── Assertions — null ─────────────────────────────────────────────────────
  'assertnotnull':             'ASSERT_NULL',
  'assertnull':                'ASSERT_NULL',
  'tobenull':                  'ASSERT_NULL',
  'tobedefined':               'ASSERT_NULL',

  // ── Assertions — visibility / state ──────────────────────────────────────
  'tobevisible':               'ASSERT_VISIBLE',
  'tobehidden':                'ASSERT_VISIBLE',     // negated form, same intent category
  'tobechecked':               'ASSERT_STATE',
  'tobedisabled':              'ASSERT_STATE',
  'tobeeditable':              'ASSERT_STATE',
  'tobeempty':                 'ASSERT_STATE',
  'tobeenabled':               'ASSERT_STATE',
  'tobefocused':               'ASSERT_STATE',

  // ── Assertions — content / property ──────────────────────────────────────
  'tohavetext':                'ASSERT_PROP',
  'tohavevalue':               'ASSERT_PROP',
  'tohaveattribute':           'ASSERT_PROP',
  'tohaveurl':                 'ASSERT_PROP',
  'tohavetitle':               'ASSERT_PROP',
  'tohaveclass':               'ASSERT_PROP',
  'tohavecss':                 'ASSERT_PROP',

  // ── Assertions — count ────────────────────────────────────────────────────
  'tohavecount':               'ASSERT_COUNT',
  'assertthat':                'ASSERT_COUNT',       // Commonly used with .hasSize()

  // ── Assertions — contains / match ────────────────────────────────────────
  'tocontain':                 'CHECK_MATCH',
  'contains':                  'CHECK_MATCH',
  'includes':                  'CHECK_MATCH',
  'assertcontains':            'CHECK_MATCH',
  'tomatch':                   'CHECK_MATCH',
  'tomatchregex':              'CHECK_MATCH',

  // ── Element state reads ───────────────────────────────────────────────────
  'isdisplayed':               'IS_DISPLAYED',
  'isvisible':                 'IS_DISPLAYED',
  'isenabled':                 'IS_DISPLAYED',
  'ischecked':                 'IS_CHECKED',
  'isselected':                'IS_CHECKED',
  'iseditable':                'IS_DISPLAYED',

  // ── Data retrieval ────────────────────────────────────────────────────────
  'gettext':                   'GET_TEXT',
  'textcontent':               'GET_TEXT',
  'innertext':                 'GET_TEXT',
  'inputvalue':                'GET_ATTR',
  'getattribute':              'GET_ATTR',
  'getcssvalue':               'GET_STYLE',
  'getcomputedstyle':          'GET_STYLE',
  'boundingbox':               'GET_BOUNDS',
  'getlocation':               'GET_BOUNDS',
  'getsize':                   'GET_BOUNDS',
  'gettagname':                'GET_TAG',

  // ── Page state reads ──────────────────────────────────────────────────────
  'gettitle':                  'GET_PAGE_TITLE',
  'title':                     'GET_PAGE_TITLE',
  'getcurrenturl':             'GET_PAGE_URL',
  'url':                       'GET_PAGE_URL',
  'getpagesource':             'GET_PAGE_SOURCE',
  'content':                   'GET_PAGE_SOURCE',

  // ── Collection operations ─────────────────────────────────────────────────
  'count':                     'COLLECTION_SIZE',
  'nth':                       'COLLECTION_INDEX',
  'first':                     'COLLECTION_INDEX',
  'last':                      'COLLECTION_INDEX',
  'all':                       'COLLECTION_ALL',
  'filter':                    'COLLECTION_FILTER',

  // ── Screenshot / visual ───────────────────────────────────────────────────
  'screenshot':                'TAKESCREENSHOT',
  'takescreenshot':            'TAKESCREENSHOT',
  'takescreenshot':            'TAKESCREENSHOT',

  // ── Browser / process control ─────────────────────────────────────────────
  'launch':                    'BROWSER_START',
  'createdriver':              'BROWSER_START',
  'createdriverforlocalexecution':  'LOCAL_EXEC',
  'createdriverforremoteexecution': 'REMOTE_EXEC',

  // ── Logging (normalized away — these don't represent test logic) ──────────
  'info':                      'LOG',
  'log':                       'LOG',
  'println':                   'LOG',
  'error':                     'LOG',
  'warn':                      'LOG',
  'debug':                     'LOG',
  'printstacktrace':           'LOG',

  // ── Configuration / data access ───────────────────────────────────────────
  'getproperty':               'FETCH_CONFIG',
  'getpropertyordefault':      'FETCH_CONFIG',
  'readfile':                  'FETCH_CONFIG',
  'readfilesync':              'FETCH_CONFIG',
  'systemgetproperty':         'FETCH_CONFIG',
  'configgetproperty':         'FETCH_CONFIG',

  // ── Data parsing / conversion ─────────────────────────────────────────────
  'parseboolean':              'DATA_CONVERSION',
  'parseint':                  'DATA_CONVERSION',
  'parsefloat':                'DATA_CONVERSION',
  'parse':                     'DATA_CONVERSION',
  'touppercase':               'STRING_OP',
  'tolowercase':               'STRING_OP',
  'trim':                      'STRING_OP',
  'replace':                   'STRING_OP',
  'split':                     'STRING_OP',

  // ── Metadata / reflection ─────────────────────────────────────────────────
  'getname':                   'REFLECT_METADATA',
  'getstatus':                 'REFLECT_METADATA',
  'getmethodname':             'REFLECT_METADATA',

  // ── Date picker (project-specific) ───────────────────────────────────────
  'setyearindatepicker':       'SET_DATE_PART',
  'setmonthindatepicker':      'SET_DATE_PART',
  'setdayindatepicker':        'SET_DATE_PART',
  'clickondatepickerimg':      'CLICK_DATE_PICKER',
  'clickondatepickerimgfrom':  'CLICK_DATE_PICKER',
  'clickondatepickerimgto':    'CLICK_DATE_PICKER',

  // ── Project-specific business intents (OrangeHRM / DashboardPage) ─────────
  'welcomemessage':            'WELCOMEMESSAGE',
  'welcomemessgae':            'WELCOMEMESSAGE',    // typo variant in source
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline-ignore list: these method names are always skipped regardless of the
// noise set above. They are framework structural wrappers with no intent.
// ─────────────────────────────────────────────────────────────────────────────
const alwaysIgnore = new Set([
  'test', 'describe', 'step', 'locator', 'waitFor', 'canRetry',
  'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
]);

// ─────────────────────────────────────────────────────────────────────────────
export class AstAnalyzer {
  constructor() {
    this.javaParser = new Parser();
    this.javaParser.setLanguage(Java);

    this.tsParser = new Parser();
    this.tsParser.setLanguage(TypeScript.typescript);
  }

  /**
   * Maps a raw method name to a canonical intent symbol.
   * Returns null if the name should be ignored entirely.
   * Lookup is case-insensitive; canonical symbols are UPPER_SNAKE_CASE.
   */
  getIntentSymbol(methodName) {
    if (!methodName) return null;

    // Always-ignore structural wrappers (case-sensitive short-circuit)
    if (alwaysIgnore.has(methodName)) return null;

    const key = methodName.toLowerCase();
    return intentMap[key] || methodName.toUpperCase();
  }

  /**
   * Extracts a flat sequence of intent symbols from an AST tree.
   * Handles Java method_invocation and TypeScript call_expression nodes.
   * Post-processes: collapses adjacent CLEAR+INPUT into a single INPUT.
   */
  extractLogicSequence(tree, language) {
    const sequence = [];
    const cursor = tree.walk();

    const traverse = (c) => {
      const node = c.currentNode;
      if (!node) return;

      const isCall =
        (language === 'java' && node.type === 'method_invocation') ||
        (language === 'ts'   && node.type === 'call_expression');

      if (isCall) {
        let rawName = '';

        if (language === 'java') {
          const nameNode = node.childForFieldName('name');
          rawName = nameNode ? nameNode.text : '';
        } else {
          // TypeScript: handle obj.method() and standalone function()
          const fnNode = node.childForFieldName('function');
          if (fnNode) {
            if (fnNode.type === 'member_expression') {
              const prop = fnNode.childForFieldName('property');
              rawName = prop ? prop.text : '';
            } else {
              rawName = fnNode.text;
            }
          }
        }

        if (rawName) {
          const upperName = rawName.toUpperCase();

          // Skip infrastructure noise
          if (infrastructureNoise.has(upperName)) {
            // still recurse into children below
          } else {
            const intent = this.getIntentSymbol(rawName);
            if (intent !== null) {
              sequence.push(intent);
            }
          }
        }
      }

      // Recurse into all children
      if (c.gotoFirstChild()) {
        traverse(c);
        while (c.gotoNextSibling()) {
          traverse(c);
        }
        c.gotoParent();
      }
    };

    traverse(cursor);

    // Post-process: collapse [CLEAR, INPUT] → [INPUT]
    // Playwright's .fill() clears first automatically, so this is one intent
    const collapsed = [];
    for (let i = 0; i < sequence.length; i++) {
      if (
        sequence[i] === 'CLEAR' &&
        i + 1 < sequence.length &&
        sequence[i + 1] === 'INPUT'
      ) {
        collapsed.push('INPUT');
        i++;
      } else {
        collapsed.push(sequence[i]);
      }
    }

    return collapsed;
  }

  /**
   * Computes a multiset intersection score between two intent sequences.
   * Unlike positional matching, this is order-insensitive — it correctly
   * handles LLMs that reorder semantically equivalent operations.
   *
   * Score = (number of matched intents) / (total intents in Java sequence) × 100
   *
   * Extra TS intents (added by LLM, not in Java) are reported separately
   * so the user can inspect if they are improvements or hallucinations.
   */
  compareMultiset(javaSeq, tsSeq) {
    const freq = {};
    javaSeq.forEach(x => { freq[x] = (freq[x] || 0) + 1; });

    let matched = 0;
    const unmatchedTs = [];

    tsSeq.forEach(x => {
      if (freq[x] > 0) {
        matched++;
        freq[x]--;
      } else {
        unmatchedTs.push(x);
      }
    });

    const missingFromTs = Object.entries(freq)
      .flatMap(([k, v]) => Array(v).fill(k));

    const score = javaSeq.length > 0 ? (matched / javaSeq.length) * 100 : 0;

    return { matched, score, missingFromTs, extraInTs: unmatchedTs };
  }

  /**
   * Computes a Longest Common Subsequence length between two arrays.
   * Useful as a secondary signal when order matters (e.g. setup → action → assert).
   */
  lcsLength(a, b) {
    const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }

  /**
   * Categorizes intent symbols by type for per-category breakdown reporting.
   */
  categorize(symbols) {
    const categories = {
      navigation:   [],
      interaction:  [],
      assertion:    [],
      dataRetrieval:[],
      browser:      [],
      network:      [],
      other:        [],
    };
    const rules = [
      [/^NAVIGATE/,         'navigation'],
      [/^(CLICK|INPUT|HOVER|DRAG|SCROLL|SELECT|TAP|KEYBOARD|MOUSE|DOUBLE|RIGHT|CLEAR)/, 'interaction'],
      [/^ASSERT|^CHECK_MATCH/, 'assertion'],
      [/^GET_|^IS_|^COLLECT/, 'dataRetrieval'],
      [/^BROWSER|^SWITCH|^VIEWPORT|^NEW_TAB|^FRAME|^COOKIE|^STORAGE/, 'browser'],
      [/^NETWORK|^JS_EXECUTE|^FILE/, 'network'],
    ];
    symbols.forEach(s => {
      const match = rules.find(([pattern]) => pattern.test(s));
      (match ? categories[match[1]] : categories.other).push(s);
    });
    return categories;
  }

  /**
   * Main comparison entry point.
   * Returns a rich accuracy report with multiset score, LCS order score,
   * per-category breakdown, missing intents, and extra TS intents.
   */
  compare(javaCode, tsCode) {
    const javaTree = this.javaParser.parse(javaCode);
    const tsTree   = this.tsParser.parse(tsCode);

    const javaSeq = this.extractLogicSequence(javaTree, 'java');
    const tsSeq   = this.extractLogicSequence(tsTree,   'ts');

    console.log('javaSeq', JSON.stringify(javaSeq));
    console.log('tsSeq  ', JSON.stringify(tsSeq));

    // Primary score: multiset (order-insensitive)
    const { matched, score, missingFromTs, extraInTs } =
      this.compareMultiset(javaSeq, tsSeq);

    // Secondary score: LCS (order-sensitive, measures sequence preservation)
    const lcs       = this.lcsLength(javaSeq, tsSeq);
    const lcsScore  = javaSeq.length > 0 ? (lcs / javaSeq.length) * 100 : 0;

    // Per-category breakdown
    const javaCats  = this.categorize(javaSeq);
    const tsCats    = this.categorize(tsSeq);
    const categoryScores = {};
    for (const cat of Object.keys(javaCats)) {
      const { score: cs } = this.compareMultiset(javaCats[cat], tsCats[cat]);
      categoryScores[cat] = cs.toFixed(1) + '%';
    }

    // Confidence tier
    let confidence;
    if (score >= 95)      confidence = 'EXCELLENT';
    else if (score >= 85) confidence = 'GOOD';
    else if (score >= 70) confidence = 'PARTIAL';
    else                  confidence = 'POOR';

    return {
      accuracyScore:    score.toFixed(2) + '%',
      orderScore:       lcsScore.toFixed(2) + '%',
      confidence,
      totalJavaIntents: javaSeq.length,
      totalTsIntents:   tsSeq.length,
      matchedIntents:   matched,
      missingFromTs,           // intents in Java not found in Playwright
      extraInTs,               // intents in Playwright not in Java (potential additions or hallucinations)
      categoryScores,          // per-category accuracy breakdown
      javaSequence:     javaSeq,
      tsSequence:       tsSeq,
    };
  }
}
