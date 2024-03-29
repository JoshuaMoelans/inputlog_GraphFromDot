from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def hello_world():  # put application's code here
    return 'Hello World!'

@app.route('/test')
def test():
    # renders the test.html page
    return render_template('test.html')

if __name__ == '__main__':
    app.run()
