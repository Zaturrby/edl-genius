const Timecode = require('timecode-boss');
const RegexPatterns = require('../common/RegexPatterns');
const MotionEffect = require('../MotionEffect/MotionEffect');

function parseCMXComment(input) {
  if (RegexPatterns.CMX_SOURCE_FILE_REGEX.test(input)) {
    const [, sourceFile] = RegexPatterns.CMX_SOURCE_FILE_REGEX.exec(input);
    return {
      sourceFile: sourceFile.trim(),
    };
  }

  if (RegexPatterns.CMX_SOURCE_CLIP_REGEX.test(input)) {
    const [, sourceClip] = RegexPatterns.CMX_SOURCE_CLIP_REGEX.exec(input);
    return {
      sourceClip: sourceClip.trim(),
    };
  }

  const [, comment] = RegexPatterns.CMX_COMMENT_REGEX.exec(input);
  return { comment };
}

function parseCMXEvent(input, sourceFrameRate, recordFrameRate) {
  const [,
    number,
    reel,
    track,
    transition,
    sourceStart,
    sourceEnd,
    recordStart,
    recordEnd,
  ] = RegexPatterns.CMX_EVENT_REGEX.exec(input);

  const [,
    trackType,
    tn,
  ] = /(\w)(\d+)?/.exec(track);

  const obj = {
    number: parseInt(number, 10),
    reel,
    trackType,
    transition,
    sourceStart: new Timecode(sourceStart, sourceFrameRate),
    sourceEnd: new Timecode(sourceEnd, sourceFrameRate),
    recordStart: new Timecode(recordStart, recordFrameRate),
    recordEnd: new Timecode(recordEnd, recordFrameRate),
  };

  if (tn) obj.trackNumber = parseInt(tn, 10);

  return obj;
}

class Event {
  constructor(input, sourceFrameRate, recordFrameRate) {
    if (input) {
      this.sourceFrameRate = Number.isNaN(sourceFrameRate) ? 29.97 : parseFloat(sourceFrameRate);
      this.recordFrameRate = Number.isNaN(recordFrameRate) ? 29.97 : parseFloat(recordFrameRate);

      if (typeof input === 'string' && RegexPatterns.CMX_EVENT_REGEX.test(input)) {
        Object.assign(this, parseCMXEvent(input, sourceFrameRate, recordFrameRate));
      } else if (typeof input === 'object') {
        Object.assign(this, input);
      } else {
        throw new TypeError('Event must be created from an Object or String.');
      }

      this.convertTimecodeProperties(this.sourceFrameRate, this.recordFrameRate);

      delete this.sourceFrameRate;
      delete this.recordFrameRate;
    }
  }

  setMotionEffect(input) {
    try {
      this.motionEffect = new MotionEffect(input);
    } catch (TypeError) {
      // do nothing, no motionEffect is set
    }
  }

  addComment(input) {
    let parsedComment = { comment: input };

    if (RegexPatterns.CMX_COMMENT_REGEX.test(input)) parsedComment = parseCMXComment(input);

    if (Object.prototype.hasOwnProperty.call(parsedComment, 'sourceFile')) {
      this.sourceFile = parsedComment.sourceFile;
    } else if (Object.prototype.hasOwnProperty.call(parsedComment, 'sourceClip')) {
      this.sourceClip = parsedComment.sourceClip;
    } else if (this.comment) {
      this.comment += parsedComment.comment.trim();
    } else {
      this.comment = parsedComment.comment.trim();
    }
  }

  toJSON(stringify) {
    const json = {};
    Object.assign(json, this);

    json.sourceStart = json.sourceStart.toString();
    json.sourceEnd = json.sourceEnd.toString();
    json.recordStart = json.recordStart.toString();
    json.recordEnd = json.recordEnd.toString();

    if (json.motionEffect && json.motionEffect.entryPoint) {
      json.motionEffect.entryPoint = json.motionEffect.entryPoint.toString();
    }

    if (stringify === true) return JSON.stringify(json);

    return json;
  }

  convertTimecodeProperties(sourceFrameRate, recordFrameRate) {
    if (this.sourceStart && !(this.sourceStart instanceof Timecode)) {
      this.sourceStart = new Timecode(this.sourceStart, sourceFrameRate);
    }
    if (this.sourceEnd && !(this.sourceEnd instanceof Timecode)) {
      this.sourceEnd = new Timecode(this.sourceEnd, sourceFrameRate);
    }
    if (this.recordStart && !(this.recordStart instanceof Timecode)) {
      this.recordStart = new Timecode(this.recordStart, recordFrameRate);
    }
    if (this.recordEnd && !(this.recordEnd instanceof Timecode)) {
      this.recordEnd = new Timecode(this.recordEnd, recordFrameRate);
    }
  }
}

module.exports = Event;
