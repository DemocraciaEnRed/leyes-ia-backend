import { validationResult } from 'express-validator';

const validate = (req, res, next) => {
    const results = validationResult(req);
    // console.dir(results)
    // if (!results.isEmpty()) {
    //     const errors = results.errors.map(err => {
    //         return {
    //             field: err.path,
    //             // Note: don't send the value, sensitive data could be leaked
    //             // value: err.value,
    //             message: req.__(err.msg.includes('validationError.') ? err.msg : `validationError.${err.msg}`)
    //         }
    //     });
    //     return res.status(422).json({message: req.__('validationError.defaultMessage'), errors: errors});
    // }
    if (!results.isEmpty()) {
        return res.status(422).send({ message: 'Hubo un error en la validación de los datos', errors: results.array() });
    }

    next();
};

export default validate;