  // For HTML, certain tags should omit their close tag. We keep a list for
  // those special-case tags.
  var omittedCloseTags = {
    area: true,
    base: true,
    br: true,
    col: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    keygen: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true // NOTE: menuitem's close tag should be omitted, but that causes problems.

  };