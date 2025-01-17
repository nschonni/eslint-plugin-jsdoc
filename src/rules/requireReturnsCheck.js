import iterateJsdoc from '../iterateJsdoc';

const canSkip = (utils, settings) => {
  const voidingTags = [
    // An abstract function is by definition incomplete
    // so it is perfectly fine if a return is documented but
    // not present within the function.
    // A subclass may inherit the doc and implement the
    // missing return.
    'abstract',
    'virtual',

    // A constructor function returns `this` by default, so may be `@returns`
    //   tag indicating this but no explicit return
    'class',
    'constructor',
    'interface',
  ];

  if (settings.mode === 'closure') {
    // Structural Interface in GCC terms, equivalent to @interface tag as far as this rule is concerned
    voidingTags.push('record');
  }

  return utils.hasATag(voidingTags) ||
    utils.isConstructor() ||
    utils.classHasTag('interface') ||
    settings.mode === 'closure' && utils.classHasTag('record');
};

export default iterateJsdoc(({
  context,
  node,
  report,
  settings,
  utils,
}) => {
  const {
    exemptAsync = true,
    exemptGenerators = settings.mode === 'typescript',
    reportMissingReturnForUndefinedTypes = false,
  } = context.options[0] || {};

  if (canSkip(utils, settings)) {
    return;
  }

  if (exemptAsync && utils.isAsync()) {
    return;
  }

  const tagName = utils.getPreferredTagName({
    tagName: 'returns',
  });
  if (!tagName) {
    return;
  }

  const tags = utils.getTags(tagName);

  if (tags.length === 0) {
    return;
  }

  if (tags.length > 1) {
    report(`Found more than one @${tagName} declaration.`);

    return;
  }

  const [
    tag,
  ] = tags;

  const returnNever = tag.type.trim() === 'never';

  if (returnNever && utils.hasValueOrExecutorHasNonEmptyResolveValue(false)) {
    report(`JSDoc @${tagName} declaration set with "never" but return expression is present in function.`);

    return;
  }

  // In case a return value is declared in JSDoc, we also expect one in the code.
  if (
    !returnNever &&
    (
      reportMissingReturnForUndefinedTypes ||
      utils.hasDefinedTypeTag(tag)
    ) &&
    !utils.hasValueOrExecutorHasNonEmptyResolveValue(
      exemptAsync,
    ) && (!exemptGenerators || !node.generator)
  ) {
    report(`JSDoc @${tagName} declaration present but return expression not available in function.`);
  }
}, {
  meta: {
    docs: {
      description: 'Requires a return statement in function body if a `@returns` tag is specified in jsdoc comment.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-require-returns-check',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          exemptAsync: {
            default: true,
            type: 'boolean',
          },
          exemptGenerators: {
            type: 'boolean',
          },
          reportMissingReturnForUndefinedTypes: {
            default: false,
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
