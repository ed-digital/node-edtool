function includesAll(subjectArr, mustIncludes){
  for (const must of mustIncludes) {
    if (!subjectArr.includes(must)) {
      return false
    }
  }

  return true
}

module.exports = includesAll