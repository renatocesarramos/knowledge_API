const queries = require('./queries')

module.exports = app => {

  const { ExistsOrError } = app.api.validation

  const save = (req, res) => {

    const article = {...req.body}

    if(req.params.id) article.id = req.params.id

    try {

      ExistsOrError(article.name, 'Nome não informado')
      ExistsOrError(article.description, 'Descrição não informada')
      ExistsOrError(article.userId, 'Usuário não informado')
      ExistsOrError(article.categoryId, 'Categoria não informada')
      ExistsOrError(article.content, 'Conteudo não informado')

    } catch (msg) {

      res.status(400).send(msg)

    }

    if (article.id) {

      app.db('articles')
        .update(article)
        .where({ id: article.id })
        .then(_ => res.status(204).send())
        .catch(err => res.status(500).send(err))

    } else {

      app.db('articles')
        .insert(article)
        .then(_ => res.status(204).send())
        .catch(err => res.status(500).send(err))
    }


  }

  const remove = async (req, res) => {

    try {

      const rowsDeleted = await app.db('articles')
        .where({ id: req.params.id }).del()
      
      ExistsOrError(rowsDeleted, 'Artigo não foi encontrado.')
      res.status(204).end()

    } catch (msg){
      res.status(400 ).send(msg)
    }


  }

  const limit = 10 // usado para paginação

  const get = async (req, res) => {

    const page  = req.query.page || 1

    const result = await app.db('articles').count('id').first()
    const count = parseInt(result.count)

    app.db('articles')
      .select('id', 'name', 'description')
      .limit(limit).offset(page * limit - limit)
      .then(articles => res.json({data: articles, count, limit}))
      .catch(err => res.status(500).send(err))
  }

  const getById = async (req, res) => {
    app.db('articles')
      .where({id : req.params.id})
      .first()
      .then(article => {
        article.content = article.content.toString()
        return res.json(article)
      })
      .catch(err => res.status(500).send(err))
  }

  const getByCategory = async (req, res) => {

    const page = req.query.page || 1
    const categories = await app.db.raw(queries.categoryWithChildren, req.params.id)
    const ids = categories.rows.map( c => c.id)

    app.db({a: 'articles', u: 'users'})
      .select('a.id', 'a.name', 'a.description', 'a.imageUrl', {author: 'u.name'})
      .limit(limit).offset(page * limit - limit)
      .whereRaw('?? = ??', ['u.id', 'a.userId'])
      .whereIn('categoryId', ids)
      .orderBy('a.id', 'desc')
      .then(articles => res.json(articles))
      .catch(err => res.status(500).send(err))
  }

  return { save, remove, get, getById, getByCategory}

}